import type { VendorOnboardingStatus, VendorShopStatus } from "@/lib/vendor/constants";

export type VendorStatusResponse = {
  userId: string;
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: "buyer" | "vendor" | "admin";
  };
  isVendor: boolean;
  hasShop: boolean;
  shop: {
    id: string;
    slug: string;
    share_code: string;
    vendor_name: string;
    description: string;
    logo_url: string | null;
    status: VendorShopStatus;
    is_active: boolean;
    shipping_flat_fee_usd: number;
    offers_pickup: boolean;
    stripe_connect_account_id: string | null;
    published_at: string | null;
    unpublished_at: string | null;
    unpublished_reason: string | null;
  } | null;
  onboarding: {
    profile_id: string;
    status: VendorOnboardingStatus;
    current_step: number;
    data_json: Record<string, unknown>;
    completed_at: string | null;
  } | null;
  subscription: {
    id: string;
    shop_id: string;
    status: string;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    stripe_price_id: string | null;
    current_period_end: string | null;
    last_invoice_status: string | null;
    cancel_at_period_end: boolean;
  } | null;
  checks: {
    canPublish: boolean;
    activeVariantCount: number;
    blockingReasons: string[];
  };
  metrics: {
    productCount: number;
    orderCount: number;
  };
};
