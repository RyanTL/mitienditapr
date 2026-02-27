import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverErrorResponse } from "@/lib/vendor/api";
import { getAppBaseUrl } from "@/lib/vendor/urls";

type ShopShareRow = {
  slug: string;
  vendor_name: string;
  share_code: string;
  is_active: boolean;
  status: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string }> },
) {
  const { shopSlug } = await params;
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("shops")
      .select("slug,vendor_name,share_code,is_active,status")
      .eq("slug", shopSlug)
      .eq("is_active", true)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const shop = (data as ShopShareRow | null) ?? null;
    if (!shop || !shop.is_active || shop.status !== "active") {
      return NextResponse.json({ error: "Tienda no disponible." }, { status: 404 });
    }

    const appBaseUrl = getAppBaseUrl({
      requestOrigin: new URL(request.url).origin,
    });

    return NextResponse.json({
      shopSlug: shop.slug,
      vendorName: shop.vendor_name,
      shareCode: shop.share_code,
      shareUrl: `${appBaseUrl}/s/${shop.share_code}`,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo preparar el enlace de la tienda.");
  }
}

