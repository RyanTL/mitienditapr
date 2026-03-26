import { NextResponse } from "next/server";

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
  getShopPoliciesByShopId,
  type VendorRequestContext,
} from "@/lib/supabase/vendor-server";

async function ensureVendorPoliciesAndSubscription(
  context: VendorRequestContext,
  shopId: string,
) {
  const { supabase } = context;

  const existingPolicies = await getShopPoliciesByShopId(supabase, shopId);
  if (!existingPolicies) {
    const { error: policyInsertError } = await supabase.from("shop_policies").insert({
      shop_id: shopId,
      refund_policy: "No se aceptan devoluciones después de 7 días.",
      shipping_policy: "Envíos de 1 a 3 días laborables.",
      privacy_policy: "Tus datos se usan solo para procesar órdenes.",
      terms: "Al comprar aceptas los términos de la tienda.",
    });

    if (policyInsertError) {
      throw new Error(policyInsertError.message);
    }
  }

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
      {
        ...requestContext,
        supabase: dataClient,
        profile,
      },
      shop.id,
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
