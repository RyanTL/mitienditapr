import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isRecord } from "@/lib/utils";
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
  upsertVendorOnboardingStep,
} from "@/lib/supabase/vendor-server";

type StepPayload = {
  step: number;
  payload?: Record<string, unknown>;
};

function readString(
  input: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = input[key];
  return typeof value === "string" ? value : fallback;
}

function mapNextStep(currentStep: number, incomingStep: number) {
  return Math.max(currentStep, incomingStep + 1);
}

async function applyStepSideEffects(input: {
  supabase: SupabaseClient;
  profileId: string;
  shopId: string;
  step: number;
  payload: Record<string, unknown>;
}) {
  const { supabase, profileId, shopId, step, payload } = input;

  if (step === 1) {
    const vendorName = readString(payload, "vendorName").trim();
    const requestedSlug = readString(payload, "slug").trim();
    const description = readString(payload, "description").trim();
    const logoUrl = readString(payload, "logoUrl").trim();

    if (vendorName) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: vendorName })
        .eq("id", profileId);
      if (profileError) {
        throw new Error(profileError.message);
      }
    }

    const slugSource = requestedSlug || vendorName;
    const slug = slugifyShopName(slugSource);
    if (!slug) {
      throw new Error("Debes indicar un nombre válido para generar el slug.");
    }

    const { error } = await supabase
      .from("shops")
      .update({
        vendor_name: vendorName || undefined,
        slug,
        description: description || null,
        logo_url: logoUrl || null,
      })
      .eq("id", shopId);

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ese URL ya está en uso. Intenta con otro nombre.");
      }
      throw new Error(error.message);
    }
    return;
  }

  // Additional steps can add side effects here as needed.
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
    return badRequestResponse("Paso inválido.");
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
      nextStep > VENDOR_ONBOARDING_STEP_COUNT ? "completed" : "in_progress";

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
