import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getVendorRequestContext, getVendorShopByProfileId } from "@/lib/supabase/vendor-server";
import {
  buildVendorPolicyCompletion,
  getCurrentShopPolicyVersions,
  getLatestVendorPolicyAcceptance,
} from "@/lib/supabase/vendor-policy-server";

export async function GET() {
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
    const shop = await getVendorShopByProfileId(dataClient, context.userId);
    if (!shop) {
      return NextResponse.json(
        {
          error: "Debes crear tu tienda primero.",
        },
        { status: 400 },
      );
    }

    const currentPolicies = await getCurrentShopPolicyVersions(dataClient, shop.id);
    const completion = buildVendorPolicyCompletion(currentPolicies);
    const latestAcceptance = await getLatestVendorPolicyAcceptance(dataClient, shop.id);

    return NextResponse.json({
      locale: "es-PR",
      currentPolicies,
      completion,
      latestAcceptance,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar las políticas.");
  }
}
