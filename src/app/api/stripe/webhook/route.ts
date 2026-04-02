import { NextResponse } from "next/server";

import {
  readStripeWebhookSecret,
  readStripeSubscription,
  type StripeInvoiceEventObject,
  type StripeSubscriptionEventObject,
  type StripeWebhookEvent,
  verifyStripeWebhookSignature,
} from "@/lib/vendor/stripe";
import {
  activateVendorStripeSubscription,
  isActiveVendorSubscriptionStatus,
  normalizeStripeSubscriptionStatus,
} from "@/lib/vendor/subscription-activation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type VendorSubscriptionRow = {
  id: string;
  shop_id: string;
  provider: string;
  provider_subscription_id: string | null;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

type ShopRow = {
  id: string;
  status: string;
  is_active: boolean;
  published_at: string | null;
};

type ShopProfileRow = {
  vendor_profile_id: string;
};

type StripeCheckoutSessionEventObject = {
  id: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

function shouldHandleStripeManagedSubscription(
  subscription: VendorSubscriptionRow | null,
): subscription is VendorSubscriptionRow {
  return Boolean(subscription && subscription.provider === "stripe");
}

async function findVendorSubscriptionByStripeRefs(input: {
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  const { subscriptionId, customerId } = input;
  const admin = createSupabaseAdminClient();

  if (subscriptionId) {
    const { data, error } = await admin
      .from("vendor_subscriptions")
      .select(
        "id,shop_id,provider,provider_subscription_id,status,stripe_subscription_id,stripe_customer_id",
      )
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data as VendorSubscriptionRow;
    }
  }

  if (customerId) {
    const { data, error } = await admin
      .from("vendor_subscriptions")
      .select(
        "id,shop_id,provider,provider_subscription_id,status,stripe_subscription_id,stripe_customer_id",
      )
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data as VendorSubscriptionRow;
    }
  }

  return null;
}

async function updateShopVisibilityFromSubscription(input: {
  shopId: string;
  subscriptionStatus: string;
  reason: "invoice_failed" | "invoice_paid" | "subscription_updated";
}) {
  const admin = createSupabaseAdminClient();
  const { data: shopData, error: shopError } = await admin
    .from("shops")
    .select("id,status,is_active,published_at")
    .eq("id", input.shopId)
    .maybeSingle();

  if (shopError) {
    throw new Error(shopError.message);
  }

  const shop = shopData as ShopRow | null;
  if (!shop) {
    return;
  }

  if (isActiveVendorSubscriptionStatus(input.subscriptionStatus)) {
    const { error: restoreError } = await admin
      .from("shops")
      .update({
        status: "active",
        is_active: true,
        published_at: shop.published_at ?? new Date().toISOString(),
        unpublished_at: null,
        unpublished_reason: null,
      })
      .eq("id", shop.id);

    if (restoreError) {
      throw new Error(restoreError.message);
    }

    return;
  }

  const isUnpaid = input.subscriptionStatus === "past_due" || input.subscriptionStatus === "unpaid";

  const { error: unpublishError } = await admin
    .from("shops")
    .update({
      status: isUnpaid ? "unpaid" : "paused",
      is_active: false,
      unpublished_at: new Date().toISOString(),
      unpublished_reason:
        input.reason === "invoice_failed"
          ? "subscription_unpaid"
          : input.subscriptionStatus === "canceled"
            ? "subscription_canceled"
            : "subscription_inactive",
    })
    .eq("id", shop.id);

  if (unpublishError) {
    throw new Error(unpublishError.message);
  }
}

async function upsertWebhookEvent(event: StripeWebhookEvent) {
  const admin = createSupabaseAdminClient();
  const { data: existingEvent, error: existingEventError } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEventError) {
    throw new Error(existingEventError.message);
  }

  if (existingEvent) {
    return false;
  }

  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
    payload: event,
    processed_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return true;
}

async function handleInvoiceEvent(event: StripeWebhookEvent<StripeInvoiceEventObject>) {
  const invoice = event.data.object;
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : undefined;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : undefined;

  const subscription = await findVendorSubscriptionByStripeRefs({
    subscriptionId,
    customerId,
  });

  if (!shouldHandleStripeManagedSubscription(subscription)) {
    return;
  }

  const admin = createSupabaseAdminClient();

  if (event.type === "invoice.payment_failed") {
    const { error: updateError } = await admin
      .from("vendor_subscriptions")
      .update({
        status: "past_due",
        last_invoice_status: invoice.status ?? "payment_failed",
      })
      .eq("id", subscription.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await updateShopVisibilityFromSubscription({
      shopId: subscription.shop_id,
      subscriptionStatus: "past_due",
      reason: "invoice_failed",
    });
    return;
  }

  if (event.type === "invoice.paid") {
    const { data: shopProfileData, error: shopProfileError } = await admin
      .from("shops")
      .select("vendor_profile_id")
      .eq("id", subscription.shop_id)
      .maybeSingle();

    if (shopProfileError) {
      throw new Error(shopProfileError.message);
    }

    const shopProfile = shopProfileData as ShopProfileRow | null;

    if (shopProfile?.vendor_profile_id) {
      await activateVendorStripeSubscription({
        supabase: admin,
        shopId: subscription.shop_id,
        profileId: shopProfile.vendor_profile_id,
        customerId: subscription.stripe_customer_id,
        subscriptionId: subscription.stripe_subscription_id,
        status: "active",
        lastInvoiceStatus: invoice.status ?? "paid",
      });
    } else {
      const { error: updateError } = await admin
        .from("vendor_subscriptions")
        .update({
          status: "active",
          last_invoice_status: invoice.status ?? "paid",
        })
        .eq("id", subscription.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    await updateShopVisibilityFromSubscription({
      shopId: subscription.shop_id,
      subscriptionStatus: "active",
      reason: "invoice_paid",
    });
  }
}

async function handleCheckoutSessionCompleted(
  event: StripeWebhookEvent<StripeCheckoutSessionEventObject>,
) {
  const session = event.data.object;
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const shopId = session.metadata?.shop_id;
  const vendorProfileId = session.metadata?.vendor_profile_id;

  const admin = createSupabaseAdminClient();
  if (shopId && vendorProfileId) {
    const subscription = subscriptionId
      ? await readStripeSubscription(subscriptionId).catch(() => null)
      : null;

    await activateVendorStripeSubscription({
      supabase: admin,
      shopId,
      profileId: vendorProfileId,
      customerId,
      subscriptionId,
      status: normalizeStripeSubscriptionStatus(subscription?.status ?? "active"),
      priceId: subscription?.items?.data?.[0]?.price?.id ?? null,
      currentPeriodEnd:
        typeof subscription?.current_period_end === "number"
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      checkoutSessionId: session.id,
      lastInvoiceStatus: "paid",
    });
  }
}

async function handleSubscriptionEvent(
  event: StripeWebhookEvent<StripeSubscriptionEventObject>,
) {
  const subscriptionObject = event.data.object;
  const subscriptionId = subscriptionObject.id;
  const customerId =
    typeof subscriptionObject.customer === "string"
      ? subscriptionObject.customer
      : undefined;
  const status = normalizeStripeSubscriptionStatus(subscriptionObject.status);
  const priceId = subscriptionObject.items?.data?.[0]?.price?.id ?? null;

  const subscription = await findVendorSubscriptionByStripeRefs({
    subscriptionId,
    customerId,
  });

  if (!shouldHandleStripeManagedSubscription(subscription)) {
    return;
  }

  const currentPeriodEnd =
    typeof subscriptionObject.current_period_end === "number"
      ? new Date(subscriptionObject.current_period_end * 1000).toISOString()
      : null;

  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("vendor_subscriptions")
    .update({
      status,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId ?? subscription.stripe_customer_id,
      stripe_price_id: priceId,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(subscriptionObject.cancel_at_period_end),
    })
    .eq("id", subscription.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await updateShopVisibilityFromSubscription({
    shopId: subscription.shop_id,
    subscriptionStatus: status,
    reason: "subscription_updated",
  });
}

export async function POST(request: Request) {
  let webhookSecret: string;

  try {
    webhookSecret = readStripeWebhookSecret();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing STRIPE_WEBHOOK_SECRET." },
      { status: 500 },
    );
  }

  const stripeSignatureHeader = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  const isValidSignature = verifyStripeWebhookSignature({
    rawBody,
    stripeSignatureHeader,
    webhookSecret,
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const isFirstTimeProcessing = await upsertWebhookEvent(event);
    if (!isFirstTimeProcessing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
      await handleInvoiceEvent(event as StripeWebhookEvent<StripeInvoiceEventObject>);
    } else if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(
        event as StripeWebhookEvent<StripeCheckoutSessionEventObject>,
      );
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionEvent(
        event as StripeWebhookEvent<StripeSubscriptionEventObject>,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el webhook de Stripe.",
      },
      { status: 500 },
    );
  }
}
