import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { slugifyShopName } from "@/lib/vendor/slug";
import {
  VENDOR_ONBOARDING_STEP_COUNT,
  type VendorOnboardingStatus,
} from "@/lib/vendor/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorOnboardingRecord,
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorPublishChecks,
  getVendorRequestContext,
  getShopPoliciesByShopId,
  upsertVendorOnboardingStep,
} from "@/lib/supabase/vendor-server";

type StepPayload = {
  step: number;
  payload?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  input: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = input[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(input: Record<string, unknown>, key: string, fallback: number) {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readBoolean(
  input: Record<string, unknown>,
  key: string,
  fallback = false,
) {
  const value = input[key];
  return typeof value === "boolean" ? value : fallback;
}

function mapNextStep(currentStep: number, incomingStep: number) {
  return Math.max(currentStep, Math.min(incomingStep + 1, VENDOR_ONBOARDING_STEP_COUNT));
}

async function applyStepSideEffects(input: {
  supabase: SupabaseClient;
  profileId: string;
  shopId: string;
  step: number;
  payload: Record<string, unknown>;
}) {
  const { supabase, profileId, shopId, step, payload } = input;

  if (step === 2) {
    const businessName = readString(payload, "businessName").trim();
    const phone = readString(payload, "phone").trim();

    if (businessName) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: businessName })
        .eq("id", profileId);
      if (profileError) {
        throw new Error(profileError.message);
      }

      const { error: shopError } = await supabase
        .from("shops")
        .update({ vendor_name: businessName })
        .eq("id", shopId);
      if (shopError) {
        throw new Error(shopError.message);
      }
    }

    if (phone) {
      // Phone is persisted in onboarding payload for MVP.
    }
    return;
  }

  if (step === 3) {
    const shopName = readString(payload, "shopName").trim();
    const requestedSlug = readString(payload, "slug").trim();
    const description = readString(payload, "description").trim();
    const logoUrl = readString(payload, "logoUrl").trim();

    const slugSource = requestedSlug || shopName;
    const slug = slugifyShopName(slugSource);
    if (!slug) {
      throw new Error("Debes indicar un nombre valido para generar el slug.");
    }

    const { error } = await supabase
      .from("shops")
      .update({
        vendor_name: shopName || undefined,
        slug,
        description,
        logo_url: logoUrl || null,
      })
      .eq("id", shopId);

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ese slug ya existe. Intenta con otro nombre.");
      }
      throw new Error(error.message);
    }
    return;
  }

  if (step === 4) {
    const shippingFlatFeeUsd = Math.max(0, readNumber(payload, "shippingFlatFeeUsd", 0));
    const offersPickup = readBoolean(payload, "offersPickup", false);

    const { error: shopError } = await supabase
      .from("shops")
      .update({
        shipping_flat_fee_usd: shippingFlatFeeUsd,
        offers_pickup: offersPickup,
      })
      .eq("id", shopId);

    if (shopError) {
      throw new Error(shopError.message);
    }

    const currentPolicies = await getShopPoliciesByShopId(supabase, shopId);
    const refundPolicy = readString(payload, "refundPolicy", currentPolicies?.refund_policy ?? "");
    const shippingPolicy = readString(
      payload,
      "shippingPolicy",
      currentPolicies?.shipping_policy ?? "",
    );
    const privacyPolicy = readString(
      payload,
      "privacyPolicy",
      currentPolicies?.privacy_policy ?? "",
    );
    const terms = readString(payload, "terms", currentPolicies?.terms ?? "");

    const { error: policiesError } = await supabase.from("shop_policies").upsert(
      {
        shop_id: shopId,
        refund_policy: refundPolicy,
        shipping_policy: shippingPolicy,
        privacy_policy: privacyPolicy,
        terms,
      },
      { onConflict: "shop_id" },
    );

    if (policiesError) {
      throw new Error(policiesError.message);
    }
    return;
  }

  if (step === 5) {
    const stripeConnectAccountId = readString(payload, "stripeConnectAccountId").trim();
    if (!stripeConnectAccountId) {
      return;
    }

    const { error } = await supabase
      .from("shops")
      .update({ stripe_connect_account_id: stripeConnectAccountId })
      .eq("id", shopId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function PATCH(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const body = await parseJsonBody<StepPayload>(request);
  if (!body || typeof body.step !== "number") {
    return badRequestResponse("El cuerpo debe incluir 'step'.");
  }

  const step = Math.trunc(body.step);
  if (step < 1 || step > VENDOR_ONBOARDING_STEP_COUNT) {
    return badRequestResponse("Paso invalido.");
  }

  const payload = isRecord(body.payload) ? body.payload : {};

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);
    const onboarding = await ensureVendorOnboardingRecord(dataClient, profile.id);

    await applyStepSideEffects({
      supabase: dataClient,
      profileId: profile.id,
      shopId: shop.id,
      step,
      payload,
    });

    const nextData = {
      ...onboarding.data_json,
      [`step_${step}`]: payload,
    };

    const nextStep = mapNextStep(onboarding.current_step, step);
    const status: VendorOnboardingStatus =
      nextStep >= VENDOR_ONBOARDING_STEP_COUNT ? "completed" : "in_progress";

    const nextOnboarding = await upsertVendorOnboardingStep(
      dataClient,
      profile.id,
      status,
      nextStep,
      nextData,
    );

    const checks = await getVendorPublishChecks(dataClient, profile.id);

    return NextResponse.json({
      onboarding: nextOnboarding,
      checks,
      nextStep: nextOnboarding.current_step,
      completed: nextOnboarding.status === "completed",
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo guardar este paso.");
  }
}
