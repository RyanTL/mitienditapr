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
  image_url: string | null;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
};

type ProductImageListRow = {
  id: string;
  image_url: string;
};

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string; imageId: string }> },
) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const { productId, imageId } = await params;
  if (!productId || !imageId) {
    return badRequestResponse("Parametros invalidos.");
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
      .select("id,shop_id,image_url")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      throw new Error(productError.message);
    }

    const product = productRow as ProductRow | null;
    if (!product || product.shop_id !== shop.id) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const { data: imageRow, error: imageError } = await dataClient
      .from("product_images")
      .select("id,product_id,image_url")
      .eq("id", imageId)
      .eq("product_id", product.id)
      .maybeSingle();

    if (imageError) {
      throw new Error(imageError.message);
    }

    const image = imageRow as ProductImageRow | null;
    if (!image) {
      return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404 });
    }

    const { error: deleteError } = await dataClient
      .from("product_images")
      .delete()
      .eq("id", image.id)
      .eq("product_id", product.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (product.image_url === image.image_url) {
      const { data: remainingImages, error: remainingImagesError } = await dataClient
        .from("product_images")
        .select("id,image_url")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (remainingImagesError) {
        throw new Error(remainingImagesError.message);
      }

      const nextPrimary = (remainingImages as ProductImageListRow[] | null)?.[0] ?? null;
      const { error: productUpdateError } = await dataClient
        .from("products")
        .update({ image_url: nextPrimary?.image_url ?? null })
        .eq("id", product.id)
        .eq("shop_id", shop.id);

      if (productUpdateError) {
        throw new Error(productUpdateError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo eliminar la imagen.");
  }
}
