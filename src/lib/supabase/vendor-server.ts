import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  VENDOR_ONBOARDING_STEP_COUNT,
  type VendorOnboardingStatus,
  type VendorShopStatus,
} from "@/lib/vendor/constants";
import { slugifyShopName } from "@/lib/vendor/slug";

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
  vendor_profile_id: string;
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
};

export type VendorSubscriptionRow = {
  id: string;
  shop_id: string;
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

export type VendorRequestContext = {
  supabase: SupabaseClient;
  userId: string;
  profile: ProfileRow;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
      "id,slug,vendor_profile_id,vendor_name,description,logo_url,status,is_active,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,published_at,unpublished_at,unpublished_reason",
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
      "id,shop_id,status,stripe_subscription_id,stripe_customer_id,stripe_price_id,current_period_end,last_invoice_status,cancel_at_period_end",
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
        "id,slug,vendor_profile_id,vendor_name,description,logo_url,status,is_active,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,published_at,unpublished_at,unpublished_reason",
      )
      .maybeSingle();

    if (data && !error) {
      return data as VendorShopRow;
    }

    if (!isUniqueViolation(error)) {
      throw new Error(error?.message ?? "No se pudo crear la tienda.");
    }
  }

  throw new Error("No se pudo generar un slug unico para la tienda.");
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
    shop.slug.trim().length > 0 &&
    shop.description.trim().length > 0
  );
}

function isActiveSubscriptionStatus(status: string | null | undefined) {
  if (!status) {
    return false;
  }

  return status === "active" || status === "trialing";
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

  const subscription = await getVendorSubscriptionByShopId(supabase, shop.id);
  const activeVariantCount = await getActiveVariantCountForShop(supabase, shop.id);

  if (!hasRequiredShopFields(shop)) {
    blockingReasons.push("Completa nombre, slug y descripcion de la tienda.");
  }

  if (!shop.stripe_connect_account_id) {
    blockingReasons.push("Conecta Stripe Express para recibir pagos.");
  }

  if (!isActiveSubscriptionStatus(subscription?.status)) {
    blockingReasons.push("Activa la suscripcion mensual de $10.");
  }

  if (activeVariantCount < 1) {
    blockingReasons.push("Debes tener al menos una variante activa.");
  }

  return {
    shop,
    subscription,
    activeVariantCount,
    canPublish: blockingReasons.length === 0,
    blockingReasons,
  };
}

export async function getVendorStatusSnapshot(context: VendorRequestContext) {
  const { supabase, userId, profile } = context;
  const shop = await getVendorShopByProfileId(supabase, userId);
  const onboarding = await getVendorOnboardingByProfileId(supabase, userId);
  const subscription = shop
    ? await getVendorSubscriptionByShopId(supabase, shop.id)
    : null;
  const checks = await getVendorPublishChecks(supabase, userId);
  const policies = shop ? await getShopPoliciesByShopId(supabase, shop.id) : null;

  const { data: productRows } = shop
    ? await supabase
        .from("products")
        .select("id")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
    : { data: [] as { id: string }[] };

  const productCount = Array.isArray(productRows) ? productRows.length : 0;

  const { data: allProductRows } = shop
    ? await supabase.from("products").select("id").eq("shop_id", shop.id)
    : { data: [] as { id: string }[] };

  let orderCount = 0;
  if (shop && Array.isArray(allProductRows) && allProductRows.length > 0) {
    const productIds = allProductRows.map((row) => row.id);
    const { data: orderItemRows } = await supabase
      .from("order_items")
      .select("order_id")
      .in("product_id", productIds);

    if (Array.isArray(orderItemRows)) {
      orderCount = new Set(orderItemRows.map((row) => row.order_id)).size;
    }
  }

  return {
    userId,
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
    },
  };
}
