import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ensureVendorOnboardingRecord,
  upsertVendorOnboardingStep,
} from "@/lib/supabase/vendor-server";
import { isActiveVendorSubscriptionStatus } from "@/lib/vendor/vendor-subscription-gates";

export {
  isActiveVendorSubscriptionStatus,
  vendorHasPremiumProductFeatures,
} from "@/lib/vendor/vendor-subscription-gates";

type StripeActivationInput = {
  supabase: SupabaseClient;
  shopId: string;
  profileId: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: string;
  priceId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  lastInvoiceStatus?: string | null;
  checkoutSessionId?: string | null;
};

export function normalizeStripeSubscriptionStatus(status: string | undefined) {
  if (!status) {
    return "inactive";
  }

  const validStatuses = new Set([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "paused",
    "inactive",
  ]);

  if (validStatuses.has(status)) {
    return status;
  }

  return "inactive";
}

export async function activateVendorStripeSubscription(input: StripeActivationInput) {
  const {
    supabase,
    shopId,
    profileId,
    customerId,
    subscriptionId,
    status,
    priceId = null,
    currentPeriodEnd = null,
    cancelAtPeriodEnd = false,
    lastInvoiceStatus = "paid",
    checkoutSessionId = null,
  } = input;

  const normalizedStatus = normalizeStripeSubscriptionStatus(status);

  const { error: upsertSubscriptionError } = await supabase
    .from("vendor_subscriptions")
    .upsert(
      {
        shop_id: shopId,
        provider: "stripe",
        status: normalizedStatus,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        current_period_end: currentPeriodEnd,
        last_invoice_status: lastInvoiceStatus,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
      { onConflict: "shop_id" },
    );

  if (upsertSubscriptionError) {
    throw new Error(upsertSubscriptionError.message);
  }

  if (!isActiveVendorSubscriptionStatus(normalizedStatus)) {
    return;
  }

  const onboarding = await ensureVendorOnboardingRecord(supabase, profileId);
  const existingStepTwo =
    onboarding.data_json.step_2 &&
    typeof onboarding.data_json.step_2 === "object" &&
    !Array.isArray(onboarding.data_json.step_2)
      ? (onboarding.data_json.step_2 as Record<string, unknown>)
      : {};

  await upsertVendorOnboardingStep(
    supabase,
    profileId,
    "completed",
    Math.max(onboarding.current_step, 2),
    {
      ...onboarding.data_json,
      step_2: {
        ...existingStepTwo,
        subscriptionCheckoutCompleted: true,
        stripeActivated: true,
        stripeCheckoutSessionId: checkoutSessionId,
        activatedAt: new Date().toISOString(),
      },
    },
  );
}
