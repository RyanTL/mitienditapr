import { NextResponse } from "next/server";

import {
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorShopByProfileId,
} from "@/lib/supabase/vendor-server";
import { getAppBaseUrl } from "@/lib/vendor/urls";

export async function GET(request: Request) {
  if (!isVendorModeEnabled) {
    return NextResponse.json({ error: "Vendor mode is disabled." }, { status: 404 });
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Fallback to user-scoped client when secret key is not configured.
  }

  try {
    const shop = await getVendorShopByProfileId(dataClient, context.userId);
    if (!shop) {
      return NextResponse.json(
        { error: "No tienes una tienda creada." },
        { status: 404 },
      );
    }

    const appBaseUrl = getAppBaseUrl({
      requestOrigin: new URL(request.url).origin,
    });

    return NextResponse.json({
      shopSlug: shop.slug,
      vendorName: shop.vendor_name,
      shareCode: shop.share_code,
      shareUrl: `${appBaseUrl}/s/${shop.share_code}`,
      shopStatus: shop.status,
      isActive: shop.is_active,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo cargar los datos para compartir.");
  }
}

