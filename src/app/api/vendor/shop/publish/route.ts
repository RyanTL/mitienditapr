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
  getVendorPublishChecks,
  getVendorRequestContext,
  upsertVendorOnboardingStep,
} from "@/lib/supabase/vendor-server";
import { VENDOR_ONBOARDING_STEP_COUNT } from "@/lib/vendor/constants";

export async function POST() {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const checks = await getVendorPublishChecks(dataClient, context.userId);
    if (!checks.shop) {
      return badRequestResponse("No encontramos tu tienda.");
    }

    if (!checks.canPublish) {
      return NextResponse.json({
        published: false,
        blockingReasons: checks.blockingReasons,
      });
    }

    const { error: activateError } = await dataClient
      .from("shops")
      .update({
        status: "active",
        is_active: true,
        published_at: new Date().toISOString(),
        unpublished_at: null,
        unpublished_reason: null,
      })
      .eq("id", checks.shop.id)
      .eq("vendor_profile_id", context.userId);

    if (activateError) {
      throw new Error(activateError.message);
    }

    const onboarding = await ensureVendorOnboardingRecord(dataClient, context.userId);
    const nextOnboarding = await upsertVendorOnboardingStep(
      dataClient,
      context.userId,
      "completed",
      VENDOR_ONBOARDING_STEP_COUNT,
      onboarding.data_json,
    );

    return NextResponse.json({
      published: true,
      blockingReasons: [],
      onboarding: nextOnboarding,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo publicar la tienda.");
  }
}
