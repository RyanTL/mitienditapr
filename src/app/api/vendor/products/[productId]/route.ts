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

type ProductPatchPayload = {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  isActive?: boolean;
  priceUsd?: number;
};

type ProductRow = {
  id: string;
  shop_id: string;
};

type OrderItemRow = {
  id: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export async function PATCH(
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

  const body = await parseJsonBody<ProductPatchPayload>(request);
  if (!body || !isRecord(body)) {
    return badRequestResponse("Cuerpo invalido.");
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

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      updates.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }
    if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
      updates.image_url =
        typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0
          ? body.imageUrl.trim()
          : null;
    }
    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    const nextPrice = getNumeric(body.priceUsd);
    if (nextPrice !== null) {
      updates.price_usd = Math.max(0, nextPrice);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await dataClient
        .from("products")
        .update(updates)
        .eq("id", product.id)
        .eq("shop_id", shop.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    if (nextPrice !== null) {
      const { data: firstVariant, error: firstVariantError } = await dataClient
        .from("product_variants")
        .select("id")
        .eq("product_id", product.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstVariantError) {
        throw new Error(firstVariantError.message);
      }

      if (firstVariant) {
        const { error: variantUpdateError } = await dataClient
          .from("product_variants")
          .update({ price_usd: Math.max(0, nextPrice) })
          .eq("id", firstVariant.id)
          .eq("product_id", product.id);

        if (variantUpdateError) {
          throw new Error(variantUpdateError.message);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo actualizar el producto.");
  }
}

export async function DELETE(
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

    const { data: orderItemRows, error: orderItemError } = await dataClient
      .from("order_items")
      .select("id")
      .eq("product_id", product.id)
      .limit(1);

    if (orderItemError) {
      throw new Error(orderItemError.message);
    }

    if ((orderItemRows as OrderItemRow[] | null)?.length) {
      return NextResponse.json(
        {
          error:
            "No puedes eliminar este producto porque tiene ordenes asociadas. Puedes desactivarlo.",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await dataClient
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("shop_id", shop.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo eliminar el producto.");
  }
}
