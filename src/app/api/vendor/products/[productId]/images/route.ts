import { NextResponse } from "next/server";

import {
  badRequestResponse,
  parseJsonBody,
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

type ImagePayload = {
  imageUrl?: string;
  alt?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
  request: Request,
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

  const body = await parseJsonBody<ImagePayload>(request);
  if (!body || !isRecord(body)) {
    return badRequestResponse("Cuerpo invalido.");
  }

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl) {
    return badRequestResponse("Debes enviar imageUrl.");
  }

  const alt = typeof body.alt === "string" ? body.alt.trim() : "";

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

    const { data: existingImages, error: countError } = await dataClient
      .from("product_images")
      .select("id")
      .eq("product_id", product.id);

    if (countError) {
      throw new Error(countError.message);
    }

    const sortOrder = (existingImages ?? []).length;
    const { data: imageRow, error: imageError } = await dataClient
      .from("product_images")
      .insert({
        product_id: product.id,
        image_url: imageUrl,
        alt: alt || null,
        sort_order: sortOrder,
      })
      .select("id,product_id,image_url,alt,sort_order")
      .single();

    if (imageError || !imageRow) {
      throw new Error(imageError?.message ?? "No se pudo guardar la imagen.");
    }

    if (!product.image_url) {
      const { error: updateProductError } = await dataClient
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", product.id)
        .eq("shop_id", shop.id);

      if (updateProductError) {
        throw new Error(updateProductError.message);
      }
    }

    return NextResponse.json(
      {
        image: {
          id: imageRow.id,
          productId: imageRow.product_id,
          imageUrl: imageRow.image_url,
          alt: imageRow.alt,
          sortOrder: imageRow.sort_order,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return serverErrorResponse(error, "No se pudo agregar la imagen.");
  }
}
