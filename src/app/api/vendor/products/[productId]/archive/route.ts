import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

type ProductRow = {
  id: string;
  shop_id: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const { productId } = await params;
  if (!productId) {
    return badRequestResponse("Product id invalido.");
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

    const { data: productRow, error: productError } = await dataClient
      .from("products")
      .select("id,shop_id")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      throw new Error(productError.message);
    }

    const product = productRow as ProductRow | null;
    if (!product || product.shop_id !== shop.id) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const [{ error: productUpdateError }, { error: variantsUpdateError }] =
      await Promise.all([
        dataClient
          .from("products")
          .update({ is_active: false })
          .eq("id", product.id)
          .eq("shop_id", shop.id),
        dataClient
          .from("product_variants")
          .update({ is_active: false })
          .eq("product_id", product.id),
      ]);

    if (productUpdateError) {
      throw new Error(productUpdateError.message);
    }

    if (variantsUpdateError) {
      throw new Error(variantsUpdateError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo archivar el producto.");
  }
}
