import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";

export function isActiveVendorSubscriptionStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

export function vendorHasPremiumProductFeatures(input: {
  subscription: { status?: string | null } | null | undefined;
  billingBypassEnabled?: boolean;
}) {
  const bypass = input.billingBypassEnabled ?? isVendorBillingBypassEnabled;
  if (bypass) {
    return true;
  }
  return isActiveVendorSubscriptionStatus(input.subscription?.status);
}
