import type { VendorOnboardingStatus, VendorShopStatus } from "@/lib/vendor/constants";
import type { PolicyTemplate, VendorPolicyCompletion } from "@/lib/policies/types";

export type VendorStatusResponse = {
  userId: string;
  billingBypassEnabled: boolean;
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
    ath_movil_phone: string | null;
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
    provider: string;
    status: string;
    provider_subscription_id: string | null;
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
    newOrderCount: number;
  };
};

export type VendorProductVariant = {
  id: string;
  productId: string;
  title: string;
  sku: string | null;
  attributes: Record<string, unknown>;
  priceUsd: number;
  stockQty: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VendorProductImage = {
  id: string;
  productId: string;
  imageUrl: string;
  alt: string | null;
  sortOrder: number;
};

export type VendorProduct = {
  id: string;
  shopId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceUsd: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants: VendorProductVariant[];
  images: VendorProductImage[];
};

export type VendorProductsResponse = {
  products: VendorProduct[];
  productLimit: number | null;
  productCount: number;
};

export type VendorShopActivationResponse = {
  shopActivated: boolean;
};

export type VendorShopSettingsResponse = {
  shop: VendorStatusResponse["shop"];
  policies: {
    shop_id: string;
    refund_policy: string;
    shipping_policy: string;
    privacy_policy: string;
    terms: string;
  } | null;
  policyCompletion?: VendorPolicyCompletion;
  currentPolicyVersionIds?: {
    terms: string;
    shipping: string;
  } | null;
  checks: VendorStatusResponse["checks"];
};

export type VendorPolicyTemplatesResponse = {
  templates: PolicyTemplate[];
};
