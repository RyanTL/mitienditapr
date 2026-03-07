import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
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
] as const;

type ReadinessResult = {
  ok: boolean;
  timestamp: string;
  missingEnv: string[];
  flags: {
    strictDbMode: boolean;
    catalogSeedEnabled: boolean;
    vendorBillingBypassEnabled: boolean;
  };
  dbConnected: boolean;
  missingTables: string[];
  checks: {
    shopsShareCode: boolean;
    profilesPhone: boolean;
    profilesAddress: boolean;
  };
  errors: string[];
};

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
  const missingEnv = REQUIRED_ENV_VARS.filter(
    (envName) => !process.env[envName],
  );

  const result: ReadinessResult = {
    ok: false,
    timestamp: new Date().toISOString(),
    missingEnv,
    flags: {
      strictDbMode: process.env.ENABLE_STRICT_DB_MODE === "true",
      catalogSeedEnabled: process.env.ENABLE_CATALOG_SEED === "true",
      vendorBillingBypassEnabled:
        process.env.ENABLE_VENDOR_BILLING_BYPASS === "true",
    },
    dbConnected: false,
    missingTables: [],
    checks: {
      shopsShareCode: false,
      profilesPhone: false,
      profilesAddress: false,
    },
    errors: [],
  };

  if (missingEnv.length > 0) {
    return NextResponse.json(result, { status: 503 });
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
    result.dbConnected = true;
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "DB readiness check failed.",
    );
  }

  result.ok =
    result.dbConnected &&
    result.missingEnv.length === 0 &&
    result.flags.strictDbMode &&
    !result.flags.catalogSeedEnabled &&
    result.missingTables.length === 0 &&
    result.checks.shopsShareCode &&
    result.checks.profilesPhone &&
    result.checks.profilesAddress &&
    result.errors.length === 0;

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
