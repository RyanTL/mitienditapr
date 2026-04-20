import { NextResponse } from "next/server";

import {
  readStripeWebhookSecret,
  readStripeSubscription,
  type StripeInvoiceEventObject,
  type StripeCheckoutSessionResponse,
  type StripeSubscriptionEventObject,
  type StripeWebhookEvent,
  verifyStripeWebhookSignature,
} from "@/lib/vendor/stripe";
import {
  clearPurchasedCartItems,
  findOrderPaymentByCheckoutSessionId,
  releaseOrderInventory,
  updateOrderPaymentState,
} from "@/lib/orders/server";
import {
  activateVendorStripeSubscription,
  isActiveVendorSubscriptionStatus,
  normalizeStripeSubscriptionStatus,
} from "@/lib/vendor/subscription-activation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  sendBuyerOrderConfirmationEmail,
  sendVendorNewOrderEmail,
} from "@/lib/email/resend";

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
  payment_status?: string;
  payment_intent?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
};

type OrderNotificationRow = {
  id: string;
  profile_id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  total_usd: number;
  shop_id: string;
  shops: Array<{
    id: string;
    slug: string;
    vendor_name: string;
    vendor_profile_id: string;
  }> | null;
};

type OrderItemNotificationRow = {
  order_id: string;
  quantity: number;
  unit_price_usd: number;
  products: Array<{
    name: string;
  }> | null;
};

type VendorProfileRow = {
  email: string | null;
};

async function fetchStripeOrderNotificationContext(orderId: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: orderData, error: orderError }, { data: itemData, error: itemError }] =
    await Promise.all([
      admin
        .from("orders")
        .select(
          "id,profile_id,buyer_name,buyer_email,total_usd,shop_id,shops(id,slug,vendor_name,vendor_profile_id)",
        )
        .eq("id", orderId)
        .maybeSingle(),
      admin
        .from("order_items")
        .select("order_id,quantity,unit_price_usd,products(name)")
        .eq("order_id", orderId),
    ]);

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (itemError) {
    throw new Error(itemError.message);
  }

  const order = orderData as OrderNotificationRow | null;
  const shopInfo = order?.shops?.[0] ?? null;
  if (!order || !shopInfo) {
    return null;
  }

  const { data: vendorData, error: vendorError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", shopInfo.vendor_profile_id)
    .maybeSingle();

  if (vendorError) {
    throw new Error(vendorError.message);
  }

  return {
    order,
    items: ((itemData ?? []) as unknown as OrderItemNotificationRow[]).map((item) => ({
      name: item.products?.[0]?.name ?? "Producto",
      quantity: item.quantity,
      unitPriceUsd: Number(item.unit_price_usd),
    })),
    vendorEmail: (vendorData as VendorProfileRow | null)?.email ?? null,
  };
}

async function handleBuyerCheckoutPaid(
  session: StripeCheckoutSessionEventObject | StripeCheckoutSessionResponse,
) {
  const admin = createSupabaseAdminClient();
  const orderId =
    session.metadata?.order_id ??
    (typeof session.client_reference_id === "string" ? session.client_reference_id : null);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!orderId) {
    return;
  }

  const paymentRecord = await findOrderPaymentByCheckoutSessionId(admin, session.id);
  if (paymentRecord?.status === "paid" || paymentRecord?.status === "refunded") {
    return;
  }

  const { data: orderRow, error: orderError } = await admin
    .from("orders")
    .select("id,profile_id")
    .eq("id", orderId)
    .maybeSingle<{ id: string; profile_id: string }>();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!orderRow) {
    return;
  }

  await updateOrderPaymentState({
    admin,
    orderId,
    paymentStatus: "paid",
    orderStatus: "paid",
    checkoutSessionId: session.id,
    paymentIntentId,
  });

  await clearPurchasedCartItems(admin, orderRow.profile_id, orderId);

  const notificationContext = await fetchStripeOrderNotificationContext(orderId);
  if (!notificationContext) {
    return;
  }

  if (notificationContext.vendorEmail) {
    const shopInfo = notificationContext.order.shops?.[0];
    if (shopInfo) {
    sendVendorNewOrderEmail({
      to: notificationContext.vendorEmail,
      vendorName: shopInfo.vendor_name,
      orderId,
      buyerEmail: notificationContext.order.buyer_email,
      buyerName: notificationContext.order.buyer_name,
      items: notificationContext.items,
      totalUsd: Number(notificationContext.order.total_usd),
      paymentMethod: "stripe",
    }).catch((error) => {
      console.error("[email] failed to send vendor new order email", { orderId, error });
    });
    }
  }

  if (notificationContext.order.buyer_email) {
    const shopInfo = notificationContext.order.shops?.[0];
    if (shopInfo) {
    sendBuyerOrderConfirmationEmail({
      to: notificationContext.order.buyer_email,
      buyerName: notificationContext.order.buyer_name,
      orderId,
      shopName: shopInfo.vendor_name,
      items: notificationContext.items,
      totalUsd: Number(notificationContext.order.total_usd),
      paymentMethod: "stripe",
    }).catch((error) => {
      console.error("[email] failed to send buyer order confirmation email", { orderId, error });
    });
    }
  }
}

async function handleBuyerCheckoutUnpaid(input: {
  sessionId: string;
  status: "failed" | "expired";
  failedReason: string;
}) {
  const admin = createSupabaseAdminClient();
  const paymentRecord = await findOrderPaymentByCheckoutSessionId(admin, input.sessionId);

  if (!paymentRecord) {
    return;
  }

  if (
    paymentRecord.status === "paid" ||
    paymentRecord.status === "refunded" ||
    paymentRecord.status === input.status
  ) {
    return;
  }

  await updateOrderPaymentState({
    admin,
    orderId: paymentRecord.order_id,
    paymentStatus: input.status,
    checkoutSessionId: input.sessionId,
    failedReason: input.failedReason,
  });

  await releaseOrderInventory(admin, paymentRecord.order_id);
}

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

async function isWebhookEventAlreadyProcessed(eventId: string) {
  const admin = createSupabaseAdminClient();
  const { data: existingEvent, error: existingEventError } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (existingEventError) {
    throw new Error(existingEventError.message);
  }

  return !!existingEvent;
}

async function markWebhookEventProcessed(event: StripeWebhookEvent) {
  const admin = createSupabaseAdminClient();
  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
    payload: event,
    processed_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
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
  if (session.metadata?.kind === "buyer_order") {
    if (session.payment_status === "paid") {
      await handleBuyerCheckoutPaid(session);
    }
    return;
  }

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

async function handleCheckoutSessionAsyncPaymentSucceeded(
  event: StripeWebhookEvent<StripeCheckoutSessionEventObject>,
) {
  await handleBuyerCheckoutPaid(event.data.object);
}

async function handleCheckoutSessionExpired(
  event: StripeWebhookEvent<StripeCheckoutSessionEventObject>,
) {
  await handleBuyerCheckoutUnpaid({
    sessionId: event.data.object.id,
    status: "expired",
    failedReason: "checkout_session_expired",
  });
}

async function handleCheckoutSessionAsyncPaymentFailed(
  event: StripeWebhookEvent<StripeCheckoutSessionEventObject>,
) {
  await handleBuyerCheckoutUnpaid({
    sessionId: event.data.object.id,
    status: "failed",
    failedReason: "stripe_async_payment_failed",
  });
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
    console.error("[stripe/webhook] Missing webhook configuration:", error);
    return NextResponse.json(
      { error: "Webhook endpoint is not configured." },
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
    const alreadyProcessed = await isWebhookEventAlreadyProcessed(event.id);
    if (alreadyProcessed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
      await handleInvoiceEvent(event as StripeWebhookEvent<StripeInvoiceEventObject>);
    } else if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(
        event as StripeWebhookEvent<StripeCheckoutSessionEventObject>,
      );
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      await handleCheckoutSessionAsyncPaymentSucceeded(
        event as StripeWebhookEvent<StripeCheckoutSessionEventObject>,
      );
    } else if (event.type === "checkout.session.async_payment_failed") {
      await handleCheckoutSessionAsyncPaymentFailed(
        event as StripeWebhookEvent<StripeCheckoutSessionEventObject>,
      );
    } else if (event.type === "checkout.session.expired") {
      await handleCheckoutSessionExpired(
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

    await markWebhookEventProcessed(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook] Failed to process event:", error);
    return NextResponse.json(
      { error: "No se pudo procesar el webhook de Stripe." },
      { status: 500 },
    );
  }
}
