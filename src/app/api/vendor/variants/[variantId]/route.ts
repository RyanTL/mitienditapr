import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

type VariantPatchPayload = {
  title?: string;
  sku?: string | null;
  attributes?: Record<string, string>;
  priceUsd?: number;
  stockQty?: number;
  isActive?: boolean;
};

type VariantRow = {
  id: string;
  product_id: string;
};

type ProductRow = {
  id: string;
  shop_id: string;
};

type VariantPriceRow = {
  price_usd: number;
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

async function syncProductPriceFromVariants(
  supabase: SupabaseClient,
  productId: string,
) {
  const { data: activeVariantRows, error } = await supabase
    .from("product_variants")
    .select("price_usd")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("price_usd", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (activeVariantRows ?? []) as VariantPriceRow[];
  if (rows.length === 0) {
    return;
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ price_usd: rows[0].price_usd })
    .eq("id", productId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ variantId: string }> },
) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const { variantId } = await params;
  if (!variantId) {
    return badRequestResponse("Variant id invalido.");
  }

  const body = await parseJsonBody<VariantPatchPayload>(request);
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

    const { data: variantRow, error: variantError } = await dataClient
      .from("product_variants")
      .select("id,product_id")
      .eq("id", variantId)
      .maybeSingle();

    if (variantError) {
      throw new Error(variantError.message);
    }

    const variant = variantRow as VariantRow | null;
    if (!variant) {
      return NextResponse.json({ error: "Variante no encontrada." }, { status: 404 });
    }

    const { data: productRow, error: productError } = await dataClient
      .from("products")
      .select("id,shop_id")
      .eq("id", variant.product_id)
      .maybeSingle();

    if (productError) {
      throw new Error(productError.message);
    }

    const product = productRow as ProductRow | null;
    if (!product || product.shop_id !== shop.id) {
      return NextResponse.json({ error: "Variante no encontrada." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      updates.title = body.title.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "sku")) {
      updates.sku = typeof body.sku === "string" && body.sku.trim().length > 0 ? body.sku : null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "attributes")) {
      updates.attributes_json = isRecord(body.attributes) ? body.attributes : {};
    }

    const priceUsd = getNumeric(body.priceUsd);
    if (priceUsd !== null) {
      updates.price_usd = Math.max(0, priceUsd);
    }

    const stockQty = getNumeric(body.stockQty);
    if (stockQty !== null) {
      updates.stock_qty = Math.max(0, Math.trunc(stockQty));
    }

    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error: updateError } = await dataClient
      .from("product_variants")
      .update(updates)
      .eq("id", variant.id)
      .eq("product_id", product.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "price_usd") ||
      Object.prototype.hasOwnProperty.call(updates, "is_active")
    ) {
      await syncProductPriceFromVariants(dataClient, product.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo actualizar la variante.");
  }
}
