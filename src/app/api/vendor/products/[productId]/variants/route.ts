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

type VariantPayload = {
  title?: string;
  sku?: string;
  attributes?: Record<string, string>;
  priceUsd?: number;
  stockQty?: number;
  isActive?: boolean;
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

function getNumeric(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
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

  const body = await parseJsonBody<VariantPayload>(request);
  if (!body || !isRecord(body)) {
    return badRequestResponse("Cuerpo invalido.");
  }

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : "Nueva variante";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const priceUsd = Math.max(0, getNumeric(body.priceUsd, 0));
  const stockQty = Math.max(0, Math.trunc(getNumeric(body.stockQty, 0)));
  const isActive = body.isActive ?? true;
  const attributes = isRecord(body.attributes) ? body.attributes : {};

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

    const { error: insertError } = await dataClient.from("product_variants").insert({
      product_id: product.id,
      title,
      sku: sku || null,
      attributes_json: attributes,
      price_usd: priceUsd,
      stock_qty: stockQty,
      is_active: isActive,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    await syncProductPriceFromVariants(dataClient, product.id);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo crear la variante.");
  }
}
