import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorOnboardingRecord,
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorPublishChecks,
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";
import { ensureDefaultShopPolicies } from "@/lib/supabase/vendor-policy-server";

async function ensureVendorPoliciesAndSubscription(
  supabase: SupabaseClient,
  shopId: string,
  profileId: string,
) {
  await ensureDefaultShopPolicies({
    supabase,
    shopId,
    publishedBy: profileId,
  });

  const { data: existingSubscription, error: existingSubscriptionError } = await supabase
    .from("vendor_subscriptions")
    .select("id")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (existingSubscriptionError) {
    throw new Error(existingSubscriptionError.message);
  }

  if (!existingSubscription) {
    const { error: subscriptionError } = await supabase
      .from("vendor_subscriptions")
      .insert({
        shop_id: shopId,
        provider: "stripe",
        status: "inactive",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
      });

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }
  }

}

export async function POST() {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const requestContext = await getVendorRequestContext();
  if (!requestContext) {
    return unauthorizedResponse();
  }

  let dataClient = requestContext.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, requestContext.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);
    const onboarding = await ensureVendorOnboardingRecord(dataClient, profile.id);

    await ensureVendorPoliciesAndSubscription(
      dataClient,
      shop.id,
      profile.id,
    );

    const checks = await getVendorPublishChecks(dataClient, profile.id);
    const snapshot = await getVendorStatusSnapshot({
      ...requestContext,
      supabase: dataClient,
      profile,
    });

    return NextResponse.json({
      onboarding,
      shop,
      checks,
      snapshot,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo iniciar el onboarding.");
  }
}
