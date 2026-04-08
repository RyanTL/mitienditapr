import type { SupabaseClient } from "@supabase/supabase-js";

import { isRecord } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildVendorPolicyCompletion,
  ensureDefaultShopPolicies,
  getCurrentShopPolicyVersions,
  getLatestVendorPolicyAcceptance,
  getRequiredPolicyIds,
} from "@/lib/supabase/vendor-policy-server";
import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";
import {
  VENDOR_FREE_TIER_PRODUCT_LIMIT,
  VENDOR_ONBOARDING_STEP_COUNT,
  type VendorOnboardingStatus,
  type VendorShopStatus,
} from "@/lib/vendor/constants";
import { slugifyShopName } from "@/lib/vendor/slug";
import type {
  PolicyTemplate,
  PolicyType,
  VendorShopPoliciesResponse,
} from "@/lib/policies/types";
import type {
  VendorPolicyTemplatesResponse,
  VendorProductsResponse,
  VendorShopSettingsResponse,
} from "@/lib/vendor/types";

type JsonRecord = Record<string, unknown>;

export type ProfileRole = "buyer" | "vendor" | "admin";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole;
};

export type VendorShopRow = {
  id: string;
  slug: string;
  share_code: string;
  vendor_profile_id: string;
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
};

export type VendorSubscriptionRow = {
  id: string;
  shop_id: string;
  provider: string;
  provider_subscription_id: string | null;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  last_invoice_status: string | null;
  cancel_at_period_end: boolean;
};

export type VendorOnboardingRow = {
  profile_id: string;
  status: VendorOnboardingStatus;
  current_step: number;
  data_json: JsonRecord;
  completed_at: string | null;
};

export type VendorShopPolicyRow = {
  shop_id: string;
  refund_policy: string;
  shipping_policy: string;
  privacy_policy: string;
  terms: string;
};

type ProductRow = {
  id: string;
  shop_id: string;
};

type VariantRow = {
  id: string;
};

type VendorProductRow = {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price_usd: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VendorProductVariantRow = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  attributes_json: Record<string, unknown>;
  price_usd: number;
  stock_qty: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VendorProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt: string | null;
  sort_order: number;
};

type PolicyTemplateRow = {
  id: string;
  policy_type: PolicyType;
  locale: string;
  title: string;
  body_template: string;
  version: number;
};

export type VendorRequestContext = {
  supabase: SupabaseClient;
  userId: string;
  profile: ProfileRow;
};

function normalizeOnboardingData(value: unknown) {
  return isRecord(value) ? value : {};
}

function getDisplayNameFromProfile(profile: ProfileRow) {
  if (profile.full_name && profile.full_name.trim().length > 0) {
    return profile.full_name.trim();
  }

  if (profile.email && profile.email.includes("@")) {
    return profile.email.split("@")[0] ?? "Mi tienda";
  }

  return "Mi tienda";
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "23505" || error.message?.toLowerCase().includes("duplicate") === true
  );
}

function mapCurrentStep(rawStep: number | null | undefined) {
  if (!rawStep || Number.isNaN(rawStep)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(rawStep), 1), VENDOR_ONBOARDING_STEP_COUNT);
}

export async function getVendorRequestContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profileData) {
    return null;
  }

  return {
    supabase,
    userId: user.id,
    profile: profileData as ProfileRow,
  } satisfies VendorRequestContext;
}

export async function getVendorShopByProfileId(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("shops")
    .select(
      "id,slug,share_code,vendor_profile_id,vendor_name,description,logo_url,status,is_active,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,ath_movil_phone,published_at,unpublished_at,unpublished_reason",
    )
    .eq("vendor_profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as VendorShopRow;
}

export async function getVendorOnboardingByProfileId(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("vendor_onboarding")
    .select("profile_id,status,current_step,data_json,completed_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as Omit<VendorOnboardingRow, "data_json"> & { data_json: unknown };

  return {
    ...row,
    current_step: mapCurrentStep(row.current_step),
    data_json: normalizeOnboardingData(row.data_json),
  } satisfies VendorOnboardingRow;
}

export async function getVendorSubscriptionByShopId(
  supabase: SupabaseClient,
  shopId: string,
) {
  const { data, error } = await supabase
    .from("vendor_subscriptions")
    .select(
      "id,shop_id,provider,provider_subscription_id,status,stripe_subscription_id,stripe_customer_id,stripe_price_id,current_period_end,last_invoice_status,cancel_at_period_end",
    )
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as VendorSubscriptionRow;
}

export async function getShopPoliciesByShopId(
  supabase: SupabaseClient,
  shopId: string,
) {
  const { data, error } = await supabase
    .from("shop_policies")
    .select("shop_id,refund_policy,shipping_policy,privacy_policy,terms")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as VendorShopPolicyRow;
}

export async function ensureVendorRole(
  supabase: SupabaseClient,
  profile: ProfileRow,
) {
  if (profile.role === "vendor" || profile.role === "admin") {
    return profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "vendor" })
    .eq("id", profile.id)
    .select("id,email,full_name,role")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo actualizar el rol de vendedor.");
  }

  return data as ProfileRow;
}

export async function ensureVendorShopForProfile(
  supabase: SupabaseClient,
  profile: ProfileRow,
) {
  const existingShop = await getVendorShopByProfileId(supabase, profile.id);
  if (existingShop) {
    return existingShop;
  }

  const baseSlug = slugifyShopName(getDisplayNameFromProfile(profile)) || "mi-tienda";
  const vendorName = getDisplayNameFromProfile(profile);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    const { data, error } = await supabase
      .from("shops")
      .insert({
        slug: candidateSlug,
        vendor_profile_id: profile.id,
        vendor_name: vendorName,
        description: "",
        status: "draft",
        is_active: false,
      })
      .select(
        "id,slug,share_code,vendor_profile_id,vendor_name,description,logo_url,status,is_active,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,ath_movil_phone,published_at,unpublished_at,unpublished_reason",
      )
      .maybeSingle();

    if (data && !error) {
      return data as VendorShopRow;
    }

    if (!isUniqueViolation(error)) {
      throw new Error(error?.message ?? "No se pudo crear la tienda.");
    }
  }

  throw new Error("No se pudo generar un slug único para la tienda.");
}

export async function ensureVendorOnboardingRecord(
  supabase: SupabaseClient,
  profileId: string,
) {
  const current = await getVendorOnboardingByProfileId(supabase, profileId);
  if (current) {
    return current;
  }

  const { data, error } = await supabase
    .from("vendor_onboarding")
    .insert({
      profile_id: profileId,
      status: "in_progress",
      current_step: 1,
      data_json: {},
    })
    .select("profile_id,status,current_step,data_json,completed_at")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo iniciar el onboarding.");
  }

  const row = data as Omit<VendorOnboardingRow, "data_json"> & { data_json: unknown };

  return {
    ...row,
    current_step: mapCurrentStep(row.current_step),
    data_json: normalizeOnboardingData(row.data_json),
  } satisfies VendorOnboardingRow;
}

export async function upsertVendorOnboardingStep(
  supabase: SupabaseClient,
  profileId: string,
  nextStatus: VendorOnboardingStatus,
  nextStep: number,
  nextData: JsonRecord,
) {
  const payload = {
    profile_id: profileId,
    status: nextStatus,
    current_step: mapCurrentStep(nextStep),
    data_json: nextData,
    completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("vendor_onboarding")
    .upsert(payload, { onConflict: "profile_id" })
    .select("profile_id,status,current_step,data_json,completed_at")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo guardar el onboarding.");
  }

  const row = data as Omit<VendorOnboardingRow, "data_json"> & { data_json: unknown };

  return {
    ...row,
    current_step: mapCurrentStep(row.current_step),
    data_json: normalizeOnboardingData(row.data_json),
  } satisfies VendorOnboardingRow;
}

async function getActiveVariantCountForShop(
  supabase: SupabaseClient,
  shopId: string,
) {
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id")
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (productsError || !productRows || productRows.length === 0) {
    return 0;
  }

  const productIds = (productRows as ProductRow[]).map((row) => row.id);
  const { data: variantRows, error: variantsError } = await supabase
    .from("product_variants")
    .select("id")
    .in("product_id", productIds)
    .eq("is_active", true);

  if (variantsError || !variantRows) {
    return 0;
  }

  return (variantRows as VariantRow[]).length;
}

function hasRequiredShopFields(shop: VendorShopRow) {
  return (
    shop.vendor_name.trim().length > 0 &&
    shop.slug.trim().length > 0
  );
}

function isManualCodeExpired(subscription: VendorSubscriptionRow | null) {
  if (!subscription) {
    return false;
  }

  if (subscription.provider !== "manual_code") {
    return false;
  }

  if (!subscription.current_period_end) {
    return false;
  }

  return new Date(subscription.current_period_end).getTime() <= Date.now();
}

function mapVendorProducts(
  products: VendorProductRow[],
  variants: VendorProductVariantRow[],
  images: VendorProductImageRow[],
): VendorProductsResponse["products"] {
  const variantsByProductId = new Map<string, VendorProductVariantRow[]>();
  variants.forEach((variant) => {
    const currentVariants = variantsByProductId.get(variant.product_id) ?? [];
    currentVariants.push(variant);
    variantsByProductId.set(variant.product_id, currentVariants);
  });

  const imagesByProductId = new Map<string, VendorProductImageRow[]>();
  images.forEach((image) => {
    const currentImages = imagesByProductId.get(image.product_id) ?? [];
    currentImages.push(image);
    imagesByProductId.set(image.product_id, currentImages);
  });

  return products.map((product) => ({
    id: product.id,
    shopId: product.shop_id,
    name: product.name,
    description: product.description,
    imageUrl: product.image_url,
    priceUsd: Number(product.price_usd),
    isActive: product.is_active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    variants: (variantsByProductId.get(product.id) ?? []).map((variant) => ({
      id: variant.id,
      productId: variant.product_id,
      title: variant.title,
      sku: variant.sku,
      attributes: variant.attributes_json,
      priceUsd: Number(variant.price_usd),
      stockQty: variant.stock_qty,
      isActive: variant.is_active,
      createdAt: variant.created_at,
      updatedAt: variant.updated_at,
    })),
    images: (imagesByProductId.get(product.id) ?? []).map((image) => ({
      id: image.id,
      productId: image.product_id,
      imageUrl: image.image_url,
      alt: image.alt,
      sortOrder: image.sort_order,
    })),
  }));
}

export async function getVendorPolicyTemplatesData(
  supabase: SupabaseClient,
): Promise<VendorPolicyTemplatesResponse> {
  const { data, error } = await supabase
    .from("policy_templates")
    .select("id,policy_type,locale,title,body_template,version")
    .eq("is_active", true)
    .eq("locale", "es-PR")
    .order("policy_type", { ascending: true })
    .order("version", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    templates: ((data as PolicyTemplateRow[] | null) ?? []).map((row) => ({
      id: row.id,
      policyType: row.policy_type,
      locale: row.locale,
      title: row.title,
      bodyTemplate: row.body_template,
      version: row.version,
    })) satisfies PolicyTemplate[],
  };
}

export async function getVendorProductsData(
  supabase: SupabaseClient,
  profile: ProfileRow,
): Promise<VendorProductsResponse> {
  const ensuredProfile = await ensureVendorRole(supabase, profile);
  const shop = await ensureVendorShopForProfile(supabase, ensuredProfile);

  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id,name,description,price_usd,image_url,is_active,created_at,updated_at")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  if (productsError || !productRows) {
    throw new Error(productsError?.message ?? "No se pudieron cargar tus productos.");
  }

  const products = productRows as VendorProductRow[];
  const subscription = await getVendorSubscriptionByShopId(supabase, shop.id);
  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";
  const productLimit = hasActiveSubscription ? null : VENDOR_FREE_TIER_PRODUCT_LIMIT;

  if (products.length === 0) {
    return {
      products: [],
      productLimit,
      productCount: 0,
    };
  }

  const productIds = products.map((product) => product.id);
  const [{ data: variantRows, error: variantsError }, { data: imageRows, error: imagesError }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select(
          "id,product_id,title,sku,attributes_json,price_usd,stock_qty,is_active,created_at,updated_at",
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("product_images")
        .select("id,product_id,image_url,alt,sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
    ]);

  if (variantsError || !variantRows) {
    throw new Error(variantsError?.message ?? "No se pudieron cargar variantes.");
  }

  if (imagesError || !imageRows) {
    throw new Error(imagesError?.message ?? "No se pudieron cargar imagenes.");
  }

  return {
    products: mapVendorProducts(
      products,
      variantRows as VendorProductVariantRow[],
      imageRows as VendorProductImageRow[],
    ),
    productLimit,
    productCount: products.length,
  };
}

export async function getVendorShopSettingsData(
  supabase: SupabaseClient,
  profileId: string,
): Promise<VendorShopSettingsResponse> {
  await maybeAutoPublishDraftShop(supabase, profileId);

  const shop = await getVendorShopByProfileId(supabase, profileId);
  if (!shop) {
    return {
      shop: null,
      policies: null,
      checks: {
        canPublish: false,
        activeVariantCount: 0,
        blockingReasons: ["Debes crear tu tienda."],
      },
    };
  }

  await ensureDefaultShopPolicies({
    supabase,
    shopId: shop.id,
    publishedBy: shop.vendor_profile_id,
  });

  const [policies, checks] = await Promise.all([
    getShopPoliciesByShopId(supabase, shop.id),
    getVendorPublishChecks(supabase, profileId),
  ]);
  const currentPolicyVersions = await getCurrentShopPolicyVersions(supabase, shop.id);

  return {
    shop,
    policies,
    policyCompletion: buildVendorPolicyCompletion(currentPolicyVersions),
    currentPolicyVersionIds: getRequiredPolicyIds(currentPolicyVersions),
    checks,
  };
}

export async function getVendorShopPoliciesData(
  supabase: SupabaseClient,
  profileId: string,
): Promise<VendorShopPoliciesResponse> {
  const shop = await getVendorShopByProfileId(supabase, profileId);
  if (!shop) {
    throw new Error("Debes crear tu tienda primero.");
  }

  await ensureDefaultShopPolicies({
    supabase,
    shopId: shop.id,
    publishedBy: shop.vendor_profile_id,
  });

  const currentPolicies = await getCurrentShopPolicyVersions(supabase, shop.id);
  const completion = buildVendorPolicyCompletion(currentPolicies);
  const latestAcceptance = await getLatestVendorPolicyAcceptance(supabase, shop.id);

  return {
    locale: "es-PR",
    currentPolicies,
    completion,
    latestAcceptance,
  };
}

export async function getVendorPublishChecks(
  supabase: SupabaseClient,
  profileId: string,
) {
  const shop = await getVendorShopByProfileId(supabase, profileId);
  const blockingReasons: string[] = [];

  if (!shop) {
    blockingReasons.push("Debes crear tu tienda.");

    return {
      shop: null,
      subscription: null,
      activeVariantCount: 0,
      canPublish: false,
      blockingReasons,
    };
  }

  let subscription = await getVendorSubscriptionByShopId(supabase, shop.id);

  await ensureDefaultShopPolicies({
    supabase,
    shopId: shop.id,
    publishedBy: shop.vendor_profile_id,
  });

  if (isManualCodeExpired(subscription)) {
    const nowIso = new Date().toISOString();
    await supabase
      .from("vendor_subscriptions")
      .update({
        status: "inactive",
        last_invoice_status: "access_code_expired",
      })
      .eq("id", subscription!.id)
      .eq("provider", "manual_code");

    await supabase
      .from("shops")
      .update({
        status: "unpaid",
        is_active: false,
        unpublished_at: nowIso,
        unpublished_reason: "access_code_expired",
      })
      .eq("id", shop.id)
      .eq("vendor_profile_id", profileId);

    subscription = {
      ...subscription!,
      status: "inactive",
    };
  }

  const activeVariantCount = await getActiveVariantCountForShop(supabase, shop.id);

  if (!hasRequiredShopFields(shop)) {
    blockingReasons.push("Completa nombre y slug de la tienda.");
  }

  if (isManualCodeExpired(subscription)) {
    blockingReasons.push("Tu acceso gratuito expiró. Redime un nuevo código o activa Stripe.");
  }

  if (activeVariantCount < 1) {
    blockingReasons.push("Debes tener al menos una variante activa.");
  }

  if (!shop.ath_movil_phone && !shop.stripe_connect_account_id) {
    blockingReasons.push("Configura Stripe o ATH Móvil para poder cobrar.");
  }

  return {
    shop,
    subscription,
    activeVariantCount,
    canPublish: blockingReasons.length === 0,
    blockingReasons,
  };
}

export async function maybeAutoPublishDraftShop(
  supabase: SupabaseClient,
  profileId: string,
) {
  const [shop, onboarding] = await Promise.all([
    getVendorShopByProfileId(supabase, profileId),
    getVendorOnboardingByProfileId(supabase, profileId),
  ]);

  if (!shop || shop.status !== "draft") {
    return {
      activated: false,
      shop,
    };
  }

  if (onboarding?.status !== "completed") {
    return {
      activated: false,
      shop,
    };
  }

  const checks = await getVendorPublishChecks(supabase, profileId);
  if (!checks.canPublish || !checks.shop) {
    return {
      activated: false,
      shop: checks.shop,
    };
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("shops")
    .update({
      status: "active",
      is_active: true,
      published_at: nowIso,
      unpublished_at: null,
      unpublished_reason: null,
    })
    .eq("id", checks.shop.id)
    .eq("vendor_profile_id", profileId)
    .eq("status", "draft");

  if (error) {
    throw new Error(error.message);
  }

  return {
    activated: true,
    shop: await getVendorShopByProfileId(supabase, profileId),
  };
}

export async function getNewOrderCountForShop(
  supabase: SupabaseClient,
  shopId: string,
): Promise<number> {
  const { data: orderRows } = await supabase
    .from("orders")
    .select("id,payment_status")
    .eq("shop_id", shopId)
    .eq("vendor_status", "new");

  return Array.isArray(orderRows)
    ? orderRows.filter(
        (row) =>
          !["requires_payment", "expired"].includes(
            (row as { payment_status?: string }).payment_status ?? "",
          ),
      ).length
    : 0;
}

type OrderItemRow = {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_usd: number;
};

type OrderRow = {
  id: string;
  vendor_status: string;
  created_at: string;
};

type ProductNameRow = {
  id: string;
  name: string;
};

export type VendorAnalytics = {
  totalRevenueUsd: number;
  orderCount: number;
  avgOrderValueUsd: number;
  revenueLastThirtyDaysUsd: number;
  topProducts: Array<{
    id: string;
    name: string;
    unitsSold: number;
    revenueUsd: number;
  }>;
  ordersByStatus: Record<string, number>;
};

export async function getVendorAnalytics(
  supabase: SupabaseClient,
  shopId: string,
): Promise<VendorAnalytics> {
  const empty: VendorAnalytics = {
    totalRevenueUsd: 0,
    orderCount: 0,
    avgOrderValueUsd: 0,
    revenueLastThirtyDaysUsd: 0,
    topProducts: [],
    ordersByStatus: {},
  };

  const { data: orderRows } = await supabase
    .from("orders")
    .select("id,vendor_status,created_at,payment_status")
    .eq("shop_id", shopId);

  if (!Array.isArray(orderRows) || orderRows.length === 0) {
    return empty;
  }

  const visibleOrders = (orderRows as Array<OrderRow & { payment_status?: string }>).filter(
    (order) => !["requires_payment", "expired"].includes(order.payment_status ?? ""),
  );
  if (visibleOrders.length === 0) {
    return empty;
  }

  const orderIds = visibleOrders.map((order) => order.id);
  const { data: itemRows } = await supabase
    .from("order_items")
    .select("order_id,product_id,quantity,unit_price_usd")
    .in("order_id", orderIds);

  if (!Array.isArray(itemRows) || itemRows.length === 0) {
    return empty;
  }

  const items = itemRows as OrderItemRow[];

  const productIds = Array.from(new Set(items.map((item) => item.product_id)));
  const { data: productRows } = await supabase
    .from("products")
    .select("id,name")
    .in("id", productIds);

  if (!Array.isArray(productRows) || productRows.length === 0) {
    return empty;
  }

  const products = productRows as ProductNameRow[];
  const productNameById = new Map(products.map((p) => [p.id, p.name]));
  const orderById = new Map(visibleOrders.map((o) => [o.id, o]));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Status counts (all orders)
  const ordersByStatus: Record<string, number> = {};
  for (const order of visibleOrders) {
    ordersByStatus[order.vendor_status] = (ordersByStatus[order.vendor_status] ?? 0) + 1;
  }

  // Revenue aggregations (exclude canceled)
  const nonCanceledOrderIds = new Set(
    visibleOrders.filter((o) => o.vendor_status !== "canceled").map((o) => o.id),
  );

  let totalRevenueUsd = 0;
  let revenueLastThirtyDaysUsd = 0;

  // Product-level aggregation
  const productStats = new Map<string, { unitsSold: number; revenueUsd: number }>();

  for (const item of items) {
    const order = orderById.get(item.order_id);
    if (!order || order.vendor_status === "canceled") {
      continue;
    }

    const lineTotal = item.quantity * item.unit_price_usd;
    totalRevenueUsd += lineTotal;

    if (new Date(order.created_at) >= thirtyDaysAgo) {
      revenueLastThirtyDaysUsd += lineTotal;
    }

    const prev = productStats.get(item.product_id) ?? { unitsSold: 0, revenueUsd: 0 };
    productStats.set(item.product_id, {
      unitsSold: prev.unitsSold + item.quantity,
      revenueUsd: prev.revenueUsd + lineTotal,
    });
  }

  const orderCount = nonCanceledOrderIds.size;
  const avgOrderValueUsd = orderCount > 0 ? totalRevenueUsd / orderCount : 0;

  const topProducts = Array.from(productStats.entries())
    .map(([id, stats]) => ({
      id,
      name: productNameById.get(id) ?? id,
      ...stats,
    }))
    .sort((a, b) => b.revenueUsd - a.revenueUsd)
    .slice(0, 5);

  return {
    totalRevenueUsd,
    orderCount,
    avgOrderValueUsd,
    revenueLastThirtyDaysUsd,
    topProducts,
    ordersByStatus,
  };
}

export async function getVendorStatusSnapshot(context: VendorRequestContext) {
  const { supabase, userId, profile } = context;
  await maybeAutoPublishDraftShop(supabase, userId);

  const shop = await getVendorShopByProfileId(supabase, userId);
  const onboarding = await getVendorOnboardingByProfileId(supabase, userId);
  const checks = await getVendorPublishChecks(supabase, userId);
  const subscription = checks.subscription;
  const policies = shop ? await getShopPoliciesByShopId(supabase, shop.id) : null;

  const { data: productRows } = shop
    ? await supabase
        .from("products")
        .select("id")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
    : { data: [] as { id: string }[] };

  const productCount = Array.isArray(productRows) ? productRows.length : 0;

  let orderCount = 0;
  let newOrderCount = 0;
  if (shop) {
    const { data: orderRows } = await supabase
      .from("orders")
      .select("id,vendor_status,payment_status")
      .eq("shop_id", shop.id);

    if (Array.isArray(orderRows)) {
      const visibleOrders = orderRows.filter(
        (row) => !["requires_payment", "expired"].includes(row.payment_status ?? ""),
      );
      orderCount = visibleOrders.length;
      newOrderCount = visibleOrders.filter((row) => row.vendor_status === "new").length;
    }
  }

  return {
    userId,
    billingBypassEnabled: isVendorBillingBypassEnabled,
    profile,
    isVendor: profile.role === "vendor" || profile.role === "admin",
    hasShop: Boolean(shop),
    shop,
    onboarding: onboarding
      ? {
          ...onboarding,
          current_step: mapCurrentStep(onboarding.current_step),
        }
      : null,
    subscription,
    policies,
    checks,
    metrics: {
      productCount,
      orderCount,
      newOrderCount,
    },
  };
}
