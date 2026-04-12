import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_POLICY_BODIES,
  DEFAULT_POLICY_TITLES,
  DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
  POLICY_LOCALE,
  REQUIRED_POLICY_TYPES,
} from "@/lib/policies/constants";
import type {
  PolicyType,
  ShopPolicyVersion,
  VendorPolicyAcceptance,
  VendorPolicyCompletion,
} from "@/lib/policies/types";
import { POLICY_TYPES } from "@/lib/policies/types";

type ShopRow = {
  id: string;
  slug: string;
  vendor_name: string;
  vendor_profile_id: string;
  is_active: boolean;
  status: string;
};

type PolicyVersionRow = {
  id: string;
  shop_id: string;
  policy_type: PolicyType;
  locale: string;
  title: string;
  body: string;
  source_template_id: string | null;
  version_number: number;
  is_current: boolean;
  published_at: string;
  published_by: string;
};

type VendorPolicyAcceptanceRow = {
  id: string;
  shop_id: string;
  accepted_by_profile_id: string;
  accepted_at: string;
  acceptance_scope: "publish" | "update";
  terms_version_id: string;
  shipping_version_id: string;
  refund_version_id: string | null;
  privacy_version_id: string | null;
};

function mapPolicyVersionRow(row: PolicyVersionRow): ShopPolicyVersion {
  return {
    id: row.id,
    shopId: row.shop_id,
    policyType: row.policy_type,
    locale: row.locale,
    title: row.title,
    body: row.body,
    sourceTemplateId: row.source_template_id,
    versionNumber: row.version_number,
    isCurrent: row.is_current,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
  };
}

function mapAcceptanceRow(
  row: VendorPolicyAcceptanceRow | null,
): VendorPolicyAcceptance | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    shopId: row.shop_id,
    acceptedByProfileId: row.accepted_by_profile_id,
    acceptedAt: row.accepted_at,
    acceptanceScope: row.acceptance_scope,
    termsVersionId: row.terms_version_id,
    shippingVersionId: row.shipping_version_id,
    refundVersionId: row.refund_version_id,
    privacyVersionId: row.privacy_version_id,
  };
}

export function isPolicyType(value: string): value is PolicyType {
  return (
    value === "terms" ||
    value === "shipping" ||
    value === "refund" ||
    value === "privacy"
  );
}

export async function getCurrentShopPolicyVersions(
  supabase: SupabaseClient,
  shopId: string,
) {
  const { data, error } = await supabase
    .from("shop_policy_versions")
    .select(
      "id,shop_id,policy_type,locale,title,body,source_template_id,version_number,is_current,published_at,published_by",
    )
    .eq("shop_id", shopId)
    .eq("is_current", true);

  if (error) {
    throw new Error(error.message);
  }

  const byType: Partial<Record<PolicyType, ShopPolicyVersion | null>> = {
    terms: null,
    shipping: null,
    refund: null,
    privacy: null,
  };

  (data as PolicyVersionRow[] | null)?.forEach((row) => {
    byType[row.policy_type] = mapPolicyVersionRow(row);
  });

  return byType;
}

export async function getLatestVendorPolicyAcceptance(
  supabase: SupabaseClient,
  shopId: string,
) {
  const { data, error } = await supabase
    .from("vendor_policy_acceptances")
    .select(
      "id,shop_id,accepted_by_profile_id,accepted_at,acceptance_scope,terms_version_id,shipping_version_id,refund_version_id,privacy_version_id",
    )
    .eq("shop_id", shopId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return mapAcceptanceRow((data as VendorPolicyAcceptanceRow | null) ?? null);
}

async function ensureShopPoliciesRowExists(
  supabase: SupabaseClient,
  shopId: string,
) {
  const { data, error } = await supabase
    .from("shop_policies")
    .select("shop_id")
    .eq("shop_id", shopId)
    .maybeSingle<{ shop_id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.shop_id) {
    return;
  }

  const { error: insertError } = await supabase.from("shop_policies").upsert(
    {
      shop_id: shopId,
      refund_policy: DEFAULT_POLICY_BODIES.refund,
      shipping_policy: DEFAULT_POLICY_BODIES.shipping,
      privacy_policy: DEFAULT_POLICY_BODIES.privacy,
      terms: DEFAULT_POLICY_BODIES.terms,
    },
    { onConflict: "shop_id" },
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export function buildVendorPolicyCompletion(
  currentPolicies: Partial<Record<PolicyType, ShopPolicyVersion | null>>,
) {
  const termsDone = Boolean(currentPolicies.terms?.id);
  const shippingDone = Boolean(currentPolicies.shipping?.id);
  const refundDone = Boolean(currentPolicies.refund?.id);
  const privacyDone = Boolean(currentPolicies.privacy?.id);

  return {
    terms: termsDone ? "completed" : "required",
    shipping: shippingDone ? "completed" : "required",
    refund: refundDone ? "completed" : "recommended",
    privacy: privacyDone ? "completed" : "recommended",
    requiredReady: termsDone && shippingDone,
  } satisfies VendorPolicyCompletion;
}

export async function getNextShopPolicyVersionNumber(
  supabase: SupabaseClient,
  shopId: string,
  policyType: PolicyType,
) {
  const { data, error } = await supabase
    .from("shop_policy_versions")
    .select("version_number")
    .eq("shop_id", shopId)
    .eq("policy_type", policyType)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ version_number: number }>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? data.version_number + 1 : 1;
}

export async function publishShopPolicyVersion(input: {
  supabase: SupabaseClient;
  shopId: string;
  policyType: PolicyType;
  title: string;
  body: string;
  sourceTemplateId?: string | null;
  publishedBy: string;
}) {
  const {
    supabase,
    shopId,
    policyType,
    title,
    body,
    sourceTemplateId = null,
    publishedBy,
  } = input;

  const nextVersionNumber = await getNextShopPolicyVersionNumber(
    supabase,
    shopId,
    policyType,
  );

  const { error: clearCurrentError } = await supabase
    .from("shop_policy_versions")
    .update({ is_current: false })
    .eq("shop_id", shopId)
    .eq("policy_type", policyType)
    .eq("is_current", true);

  if (clearCurrentError) {
    throw new Error(clearCurrentError.message);
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("shop_policy_versions")
    .insert({
      shop_id: shopId,
      policy_type: policyType,
      locale: POLICY_LOCALE,
      title,
      body,
      source_template_id: sourceTemplateId,
      version_number: nextVersionNumber,
      is_current: true,
      published_by: publishedBy,
    })
    .select(
      "id,shop_id,policy_type,locale,title,body,source_template_id,version_number,is_current,published_at,published_by",
    )
    .maybeSingle();

  if (insertError || !insertedRow) {
    throw new Error(insertError?.message ?? "No se pudo publicar la política.");
  }

  const version = mapPolicyVersionRow(insertedRow as PolicyVersionRow);

  const basePolicyPatch: Record<string, unknown> = {};
  if (policyType === "terms") {
    basePolicyPatch.terms = body;
    basePolicyPatch.terms_version_id = version.id;
  } else if (policyType === "shipping") {
    basePolicyPatch.shipping_policy = body;
    basePolicyPatch.shipping_version_id = version.id;
  } else if (policyType === "refund") {
    basePolicyPatch.refund_policy = body;
    basePolicyPatch.refund_version_id = version.id;
  } else if (policyType === "privacy") {
    basePolicyPatch.privacy_policy = body;
    basePolicyPatch.privacy_version_id = version.id;
  }

  const { error: syncSnapshotError } = await supabase
    .from("shop_policies")
    .upsert(
      {
        shop_id: shopId,
        ...basePolicyPatch,
      },
      { onConflict: "shop_id" },
    );

  if (syncSnapshotError) {
    throw new Error(syncSnapshotError.message);
  }

  return version;
}

export async function ensureDefaultShopPolicies(input: {
  supabase: SupabaseClient;
  shopId: string;
  publishedBy: string;
}) {
  const { supabase, shopId, publishedBy } = input;

  await ensureShopPoliciesRowExists(supabase, shopId);

  let currentPolicies = await getCurrentShopPolicyVersions(supabase, shopId);
  const defaultedPolicyTypes: PolicyType[] = [];

  for (const policyType of POLICY_TYPES) {
    if (currentPolicies[policyType]?.id) {
      continue;
    }

    try {
      await publishShopPolicyVersion({
        supabase,
        shopId,
        policyType,
        title: DEFAULT_POLICY_TITLES[policyType],
        body: DEFAULT_POLICY_BODIES[policyType],
        publishedBy,
      });
      defaultedPolicyTypes.push(policyType);
    } catch (err) {
      // Duplicate key means a concurrent request already created this version — safe to ignore.
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("duplicate key")) {
        throw err;
      }
    }
  }

  if (defaultedPolicyTypes.length > 0) {
    currentPolicies = await getCurrentShopPolicyVersions(supabase, shopId);
  }

  let acceptanceCreated = false;
  const requiredIds = getRequiredPolicyIds(currentPolicies);
  const defaultedRequiredPolicy = defaultedPolicyTypes.some((policyType) =>
    REQUIRED_POLICY_TYPES.includes(policyType),
  );

  if (requiredIds && defaultedRequiredPolicy) {
    const hasRequiredAcceptance = await hasPolicyAcceptanceForCurrentRequired({
      supabase,
      shopId,
      termsVersionId: requiredIds.terms,
      shippingVersionId: requiredIds.shipping,
    });

    if (!hasRequiredAcceptance) {
      await createVendorPolicyAcceptance({
        supabase,
        shopId,
        acceptedByProfileId: publishedBy,
        acceptanceScope: "publish",
        termsVersionId: requiredIds.terms,
        shippingVersionId: requiredIds.shipping,
        refundVersionId: currentPolicies.refund?.id ?? null,
        privacyVersionId: currentPolicies.privacy?.id ?? null,
        acceptanceText: DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
      });
      acceptanceCreated = true;
    }
  }

  return {
    currentPolicies,
    defaultedPolicyTypes,
    acceptanceCreated,
  };
}

export async function createVendorPolicyAcceptance(input: {
  supabase: SupabaseClient;
  shopId: string;
  acceptedByProfileId: string;
  acceptanceScope: "publish" | "update";
  termsVersionId: string;
  shippingVersionId: string;
  refundVersionId?: string | null;
  privacyVersionId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  acceptanceText: string;
}) {
  const {
    supabase,
    shopId,
    acceptedByProfileId,
    acceptanceScope,
    termsVersionId,
    shippingVersionId,
    refundVersionId = null,
    privacyVersionId = null,
    ipHash = null,
    userAgent = null,
    acceptanceText,
  } = input;

  const { data, error } = await supabase
    .from("vendor_policy_acceptances")
    .insert({
      shop_id: shopId,
      accepted_by_profile_id: acceptedByProfileId,
      acceptance_scope: acceptanceScope,
      terms_version_id: termsVersionId,
      shipping_version_id: shippingVersionId,
      refund_version_id: refundVersionId,
      privacy_version_id: privacyVersionId,
      ip_hash: ipHash,
      user_agent: userAgent,
      acceptance_text: acceptanceText,
    })
    .select(
      "id,shop_id,accepted_by_profile_id,accepted_at,acceptance_scope,terms_version_id,shipping_version_id,refund_version_id,privacy_version_id",
    )
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo guardar la aceptación legal.");
  }

  return mapAcceptanceRow(data as VendorPolicyAcceptanceRow)!;
}

export async function getActiveShopBySlug(
  supabase: SupabaseClient,
  shopSlug: string,
) {
  const { data, error } = await supabase
    .from("shops")
    .select("id,slug,vendor_name,vendor_profile_id,is_active,status")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const shop = (data as ShopRow | null) ?? null;
  if (!shop || !shop.is_active || shop.status !== "active") {
    return null;
  }

  return shop;
}

export function getRequiredPolicyIds(
  currentPolicies: Partial<Record<PolicyType, ShopPolicyVersion | null>>,
) {
  const termsId = currentPolicies.terms?.id ?? null;
  const shippingId = currentPolicies.shipping?.id ?? null;
  if (!termsId || !shippingId) {
    return null;
  }

  return {
    terms: termsId,
    shipping: shippingId,
  };
}

export async function hasPolicyAcceptanceForCurrentRequired(input: {
  supabase: SupabaseClient;
  shopId: string;
  termsVersionId: string;
  shippingVersionId: string;
}) {
  const { supabase, shopId, termsVersionId, shippingVersionId } = input;

  const { data, error } = await supabase
    .from("vendor_policy_acceptances")
    .select("id")
    .eq("shop_id", shopId)
    .eq("terms_version_id", termsVersionId)
    .eq("shipping_version_id", shippingVersionId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export function getMissingRequiredPolicyTypes(
  currentPolicies: Partial<Record<PolicyType, ShopPolicyVersion | null>>,
) {
  return REQUIRED_POLICY_TYPES.filter((policyType) => !currentPolicies[policyType]?.id);
}
