export const VENDOR_ONBOARDING_STEPS = [
  { step: 1, title: "Tu tienda", description: "Configura el nombre y aspecto de tu tienda." },
] as const;

export const VENDOR_FREE_TIER_PRODUCT_LIMIT = 4;

export type VendorStep = (typeof VENDOR_ONBOARDING_STEPS)[number]["step"];

export const VENDOR_ONBOARDING_STEP_COUNT = VENDOR_ONBOARDING_STEPS.length;

export const VENDOR_DEFAULT_SUBSCRIPTION_PRICE_USD = 10;
export const VENDOR_DEFAULT_SUBSCRIPTION_INTERVAL = "month";

export const VENDOR_ORDER_STATUSES = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "canceled",
] as const;

export type VendorOrderStatus = (typeof VENDOR_ORDER_STATUSES)[number];

export const VENDOR_ORDER_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  new: ["processing", "canceled"],
  processing: ["shipped", "canceled"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

export const VENDOR_SHOP_STATUSES = ["draft", "active", "paused", "unpaid"] as const;

export type VendorShopStatus = (typeof VENDOR_SHOP_STATUSES)[number];

export const VENDOR_ONBOARDING_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export type VendorOnboardingStatus = (typeof VENDOR_ONBOARDING_STATUSES)[number];
