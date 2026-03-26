import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  calculateManualCodePeriodEnd,
  hashAccessCode,
  isAccessCodeExpired,
  normalizeAccessCode,
  type VendorAccessCodeRow,
} from "@/lib/vendor/access-codes";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorOnboardingRecord,
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorPublishChecks,
  getVendorRequestContext,
  getVendorStatusSnapshot,
  getVendorSubscriptionByShopId,
  upsertVendorOnboardingStep,
} from "@/lib/supabase/vendor-server";

type RedeemCodePayload = {
  code?: string;
};

function isActiveSubscriptionStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

function normalizeCode(input: string | undefined) {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const normalized = normalizeAccessCode(input);
  return normalized.length > 0 ? normalized : null;
}

export async function POST(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as RedeemCodePayload | null;
  const normalizedCode = normalizeCode(body?.code);
  if (!normalizedCode) {
    return badRequestResponse("Debes escribir un código válido.");
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);
    const currentSubscription = await getVendorSubscriptionByShopId(dataClient, shop.id);

    if (
      currentSubscription &&
      currentSubscription.provider === "stripe" &&
      isActiveSubscriptionStatus(currentSubscription.status)
    ) {
      return badRequestResponse("Tu tienda ya tiene una suscripción activa.");
    }

    const codeHash = hashAccessCode(normalizedCode);
    const { data: rawCode, error: codeError } = await dataClient
      .from("vendor_access_codes")
      .select(
        "id,code_hash,label,is_active,max_redemptions,redeemed_count,benefit_type,benefit_months,expires_at",
      )
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (codeError) {
      throw new Error(codeError.message);
    }

    const accessCode = (rawCode as VendorAccessCodeRow | null) ?? null;
    if (!accessCode) {
      return badRequestResponse("Código inválido.");
    }

    if (!accessCode.is_active) {
      return badRequestResponse("Este código no está activo.");
    }

    if (isAccessCodeExpired(accessCode.expires_at)) {
      return badRequestResponse("Este código expiró.");
    }

    if (
      accessCode.max_redemptions !== null &&
      accessCode.redeemed_count >= accessCode.max_redemptions
    ) {
      return badRequestResponse("Este código ya alcanzó su límite de usos.");
    }

    const { data: existingRedemption, error: redemptionLookupError } = await dataClient
      .from("vendor_access_code_redemptions")
      .select("id")
      .eq("code_id", accessCode.id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (redemptionLookupError) {
      throw new Error(redemptionLookupError.message);
    }

    if (existingRedemption) {
      return NextResponse.json({
        ok: true,
        alreadyRedeemed: true,
      });
    }

    const nextRedeemedCount = accessCode.redeemed_count + 1;
    let incrementQuery = dataClient
      .from("vendor_access_codes")
      .update({ redeemed_count: nextRedeemedCount })
      .eq("id", accessCode.id)
      .eq("redeemed_count", accessCode.redeemed_count);

    if (accessCode.max_redemptions !== null) {
      incrementQuery = incrementQuery.lt("redeemed_count", accessCode.max_redemptions);
    }

    const { data: incrementedCode, error: incrementError } = await incrementQuery
      .select("id")
      .maybeSingle();

    if (incrementError) {
      throw new Error(incrementError.message);
    }

    if (!incrementedCode) {
      return badRequestResponse("Este código ya no tiene redenciones disponibles.");
    }

    const periodEnd = calculateManualCodePeriodEnd({
      benefitType: accessCode.benefit_type,
      benefitMonths: accessCode.benefit_months,
    });

    const { error: insertRedemptionError } = await dataClient
      .from("vendor_access_code_redemptions")
      .insert({
        code_id: accessCode.id,
        profile_id: profile.id,
        shop_id: shop.id,
        benefit_type: accessCode.benefit_type,
        benefit_months: accessCode.benefit_months,
      });

    if (insertRedemptionError) {
      await dataClient
        .from("vendor_access_codes")
        .update({ redeemed_count: accessCode.redeemed_count })
        .eq("id", accessCode.id)
        .eq("redeemed_count", nextRedeemedCount);
      throw new Error(insertRedemptionError.message);
    }

    const { error: upsertSubscriptionError } = await dataClient
      .from("vendor_subscriptions")
      .upsert(
        {
          shop_id: shop.id,
          provider: "manual_code",
          provider_subscription_id: `code_${accessCode.id}`,
          status: "active",
          current_period_end: periodEnd,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_price_id: null,
          last_invoice_status: "invite_code",
          cancel_at_period_end: false,
        },
        { onConflict: "shop_id" },
      );

    if (upsertSubscriptionError) {
      throw new Error(upsertSubscriptionError.message);
    }

    const onboarding = await ensureVendorOnboardingRecord(dataClient, profile.id);
    await upsertVendorOnboardingStep(
      dataClient,
      profile.id,
      "completed",
      Math.max(onboarding.current_step, 2),
      {
        ...onboarding.data_json,
        step_2: {
          accessCodeRedeemed: true,
          accessCodeLabel: accessCode.label,
          benefitType: accessCode.benefit_type,
          benefitMonths: accessCode.benefit_months,
          currentPeriodEnd: periodEnd,
        },
      },
    );

    const checks = await getVendorPublishChecks(dataClient, profile.id);
    const snapshot = await getVendorStatusSnapshot({
      ...context,
      supabase: dataClient,
      profile,
    });

    return NextResponse.json({
      ok: true,
      alreadyRedeemed: false,
      benefitType: accessCode.benefit_type,
      benefitMonths: accessCode.benefit_months,
      currentPeriodEnd: periodEnd,
      checks,
      snapshot,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo redimir el código.");
  }
}
