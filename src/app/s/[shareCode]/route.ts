import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ShareRedirectRow = {
  slug: string;
  is_active: boolean;
  status: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> },
) {
  const { shareCode } = await params;
  const normalizedShareCode = shareCode.trim().toLowerCase();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("shops")
    .select("slug,is_active,status")
    .eq("share_code", normalizedShareCode)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return new Response("Tienda no disponible", { status: 404 });
  }

  const shop = (data as ShareRedirectRow | null) ?? null;
  if (!shop || !shop.is_active || shop.status !== "active") {
    return new Response("Tienda no disponible", { status: 404 });
  }

  const redirectUrl = new URL(`/${shop.slug}`, request.url);
  return NextResponse.redirect(redirectUrl, 307);
}

