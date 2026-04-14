import { NextResponse } from "next/server";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureDefaultShopPolicies,
  getActiveShopBySlug,
  getCurrentShopPolicyVersions,
  getRequiredPolicyIds,
} from "@/lib/supabase/vendor-policy-server";

type RouteParams = {
  params: Promise<{ shopSlug: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { shopSlug } = await params;
  const supabase = await createSupabaseServerClient();

  try {
    const shop = await getActiveShopBySlug(supabase, shopSlug);
    if (!shop) {
      return NextResponse.json(
        { error: "Tienda no disponible." },
        { status: 404 },
      );
    }

    let adminClient: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
      adminClient = createSupabaseAdminClient();
    } catch {
      // Secret key may not exist in development.
    }

    await ensureDefaultShopPolicies({
      supabase: adminClient ?? supabase,
      shopId: shop.id,
      publishedBy: shop.vendor_profile_id,
    });

    const policies = await getCurrentShopPolicyVersions(supabase, shop.id);

    return NextResponse.json({
      shopId: shop.id,
      shopSlug: shop.slug,
      vendorName: shop.vendor_name,
      requiredPolicyVersionIds: getRequiredPolicyIds(policies),
      policies,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar las políticas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
