import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  createStripeCustomer,
  createStripeSubscriptionCheckoutSession,
  readVendorPriceId,
} from "@/lib/vendor/stripe";
import { getAppBaseUrl } from "@/lib/vendor/urls";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
  getVendorSubscriptionByShopId,
} from "@/lib/supabase/vendor-server";

export async function POST(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);
    const existingSubscription = await getVendorSubscriptionByShopId(dataClient, shop.id);
    const requestOrigin = new URL(request.url).origin;
    const baseUrl = getAppBaseUrl({ requestOrigin });

    if (isVendorBillingBypassEnabled) {
      const periodEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
      const fallbackCustomerId =
        existingSubscription?.stripe_customer_id ?? `cus_dev_${profile.id.slice(0, 10)}`;
      const fallbackSubscriptionId =
        existingSubscription?.stripe_subscription_id ?? `sub_dev_${shop.id.slice(0, 10)}`;

      const { error: upsertSubscriptionError } = await dataClient
        .from("vendor_subscriptions")
        .upsert(
          {
            shop_id: shop.id,
            provider: "stripe",
            status: "active",
            stripe_customer_id: fallbackCustomerId,
            stripe_subscription_id: fallbackSubscriptionId,
            stripe_price_id:
              existingSubscription?.stripe_price_id ?? "price_dev_bypass_monthly_10",
            current_period_end: periodEnd,
            last_invoice_status: "paid",
            cancel_at_period_end: false,
          },
          { onConflict: "shop_id" },
        );

      if (upsertSubscriptionError) {
        throw new Error(upsertSubscriptionError.message);
      }

      return NextResponse.json({
        url: `${baseUrl}/vendedor/onboarding?step=6&subscription=success`,
      });
    }

    const priceId = readVendorPriceId();

    let customerId = existingSubscription?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: profile.email,
        name: profile.full_name,
      });
      customerId = customer.id;
    }

    const checkoutSession = await createStripeSubscriptionCheckoutSession({
      customerId,
      priceId,
      successUrl: `${baseUrl}/vendedor/onboarding?step=6&subscription=success`,
      cancelUrl: `${baseUrl}/vendedor/onboarding?step=6&subscription=cancel`,
      metadata: {
        shop_id: shop.id,
        vendor_profile_id: profile.id,
      },
    });

    const { error: upsertSubscriptionError } = await dataClient
      .from("vendor_subscriptions")
      .upsert(
        {
          shop_id: shop.id,
          provider: "stripe",
          status: existingSubscription?.status ?? "inactive",
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
        },
        { onConflict: "shop_id" },
      );

    if (upsertSubscriptionError) {
      throw new Error(upsertSubscriptionError.message);
    }

    if (!checkoutSession.url) {
      throw new Error("Stripe no devolvio URL de checkout.");
    }

    return NextResponse.json({
      url: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo iniciar el checkout de suscripcion.");
  }
}
