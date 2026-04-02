import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

const STRIPE_REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_VENDOR_PRICE_ID",
] as const;

const REQUIRED_TABLES = [
  "profiles",
  "shops",
  "products",
  "favorites",
  "shop_follows",
  "cart_items",
  "orders",
  "order_items",
  "vendor_onboarding",
  "vendor_subscriptions",
  "product_variants",
  "product_reviews",
  "shop_policies",
  "policy_templates",
  "shop_policy_versions",
  "vendor_policy_acceptances",
  "order_policy_snapshots",
  "vendor_access_codes",
  "vendor_access_code_redemptions",
] as const;

type ReadinessResult = {
  ok: boolean;
  timestamp: string;
  missingEnv: string[];
  flags: {
    strictDbMode: boolean;
    catalogSeedEnabled: boolean;
    vendorBillingBypassEnabled: boolean;
    productionBillingBypassDisabled: boolean;
  };
  dbConnected: boolean;
  missingTables: string[];
  checks: {
    shopsShareCode: boolean;
    profilesPhone: boolean;
    profilesAddress: boolean;
    shopPoliciesTermsVersion: boolean;
    shopPoliciesShippingVersion: boolean;
  };
  errors: string[];
};

type PublicReadinessResult = Pick<ReadinessResult, "ok" | "timestamp">;

async function checkTableExists(admin: SupabaseClient, tableName: string) {
  const { error } = await admin
    .from(tableName)
    .select("*", { head: true, count: "exact" })
    .limit(1);

  if (!error) {
    return true;
  }

  if (error.code === "PGRST205") {
    return false;
  }

  throw new Error(error.message);
}

async function checkColumnExists(
  admin: SupabaseClient,
  tableName: string,
  columnList: string,
) {
  const { error } = await admin
    .from(tableName)
    .select(columnList, { head: true, count: "exact" })
    .limit(1);

  if (!error) {
    return true;
  }

  if (error.code === "PGRST204" || error.code === "PGRST205") {
    return false;
  }

  throw new Error(error.message);
}

export async function GET() {
  const vendorBillingBypassEnabled = process.env.ENABLE_VENDOR_BILLING_BYPASS === "true";
  const dynamicRequiredEnv = [
    ...REQUIRED_ENV_VARS,
    ...(vendorBillingBypassEnabled ? [] : STRIPE_REQUIRED_ENV_VARS),
  ] as string[];

  const missingEnv = dynamicRequiredEnv.filter((envName) => !process.env[envName]);

  const result: ReadinessResult = {
    ok: false,
    timestamp: new Date().toISOString(),
    missingEnv,
    flags: {
      strictDbMode: process.env.ENABLE_STRICT_DB_MODE === "true",
      catalogSeedEnabled: process.env.ENABLE_CATALOG_SEED === "true",
      vendorBillingBypassEnabled,
      productionBillingBypassDisabled:
        process.env.NODE_ENV !== "production" || !vendorBillingBypassEnabled,
    },
    dbConnected: false,
    missingTables: [],
    checks: {
      shopsShareCode: false,
      profilesPhone: false,
      profilesAddress: false,
      shopPoliciesTermsVersion: false,
      shopPoliciesShippingVersion: false,
    },
    errors: [],
  };

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: result.timestamp,
      } satisfies PublicReadinessResult,
      { status: 503 },
    );
  }

  try {
    const admin = createSupabaseAdminClient();

    await Promise.all(
      REQUIRED_TABLES.map(async (tableName) => {
        const exists = await checkTableExists(admin, tableName);
        if (!exists) {
          result.missingTables.push(tableName);
        }
      }),
    );

    result.checks.shopsShareCode = await checkColumnExists(
      admin,
      "shops",
      "id,share_code",
    );
    result.checks.profilesPhone = await checkColumnExists(
      admin,
      "profiles",
      "id,phone",
    );
    result.checks.profilesAddress = await checkColumnExists(
      admin,
      "profiles",
      "id,address",
    );
    result.checks.shopPoliciesTermsVersion = await checkColumnExists(
      admin,
      "shop_policies",
      "shop_id,terms_version_id",
    );
    result.checks.shopPoliciesShippingVersion = await checkColumnExists(
      admin,
      "shop_policies",
      "shop_id,shipping_version_id",
    );
    result.dbConnected = true;
  } catch (error) {
    console.error("[readiness] Readiness check failed:", error);
    result.errors.push(
      error instanceof Error ? error.message : "DB readiness check failed.",
    );
  }

  result.ok =
    result.dbConnected &&
    result.missingEnv.length === 0 &&
    result.flags.strictDbMode &&
    !result.flags.catalogSeedEnabled &&
    result.flags.productionBillingBypassDisabled &&
    result.missingTables.length === 0 &&
    result.checks.shopsShareCode &&
    result.checks.profilesPhone &&
    result.checks.profilesAddress &&
    result.checks.shopPoliciesTermsVersion &&
    result.checks.shopPoliciesShippingVersion &&
    result.errors.length === 0;

  const publicResult: PublicReadinessResult = {
    ok: result.ok,
    timestamp: result.timestamp,
  };

  return NextResponse.json(publicResult, { status: result.ok ? 200 : 503 });
}
