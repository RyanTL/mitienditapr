import { NextResponse } from "next/server";

import { isRecord } from "@/lib/utils";
import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { VENDOR_FREE_TIER_PRODUCT_LIMIT } from "@/lib/vendor/constants";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
  getVendorSubscriptionByShopId,
} from "@/lib/supabase/vendor-server";

type VariantPayload = {
  title?: string;
  sku?: string;
  priceUsd?: number;
  stockQty?: number | null | "";
  isActive?: boolean;
  attributes?: Record<string, string>;
};

type ProductImagePayload = {
  imageUrl?: string;
  alt?: string | null;
};

type ProductPayload = {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  images?: ProductImagePayload[];
  isActive?: boolean;
  variant?: VariantPayload;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price_usd: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  attributes_json: Record<string, unknown>;
  price_usd: number;
  stock_qty: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt: string | null;
  sort_order: number;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumeric(value: unknown, fallback = 0) {
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

function mapProductResponse(
  products: ProductRow[],
  variants: VariantRow[],
  images: ImageRow[],
) {
  const variantsByProductId = new Map<string, VariantRow[]>();
  variants.forEach((variant) => {
    const list = variantsByProductId.get(variant.product_id) ?? [];
    variantsByProductId.set(variant.product_id, [...list, variant]);
  });

  const imagesByProductId = new Map<string, ImageRow[]>();
  images.forEach((image) => {
    const list = imagesByProductId.get(image.product_id) ?? [];
    imagesByProductId.set(image.product_id, [...list, image]);
  });

  return products.map((product) => ({
    id: product.id,
    shopId: product.shop_id,
    name: product.name,
    description: product.description,
    imageUrl: product.image_url || null,
    priceUsd: Number(product.price_usd),
    isActive: product.is_active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    variants: (variantsByProductId.get(product.id) ?? []).map((variant) => ({
      id: variant.id,
      productId: variant.product_id,
      title: variant.title,
      sku: variant.sku,
      attributes: variant.attributes_json,
      priceUsd: Number(variant.price_usd),
      stockQty: variant.stock_qty,
      isActive: variant.is_active,
      createdAt: variant.created_at,
      updatedAt: variant.updated_at,
    })),
    images: (imagesByProductId.get(product.id) ?? []).map((image) => ({
      id: image.id,
      productId: image.product_id,
      imageUrl: image.image_url,
      alt: image.alt,
      sortOrder: image.sort_order,
    })),
  }));
}

export async function GET() {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  const shop = await ensureVendorShopForProfile(dataClient, context.profile);

  const { data: productRows, error: productsError } = await dataClient
    .from("products")
    .select("id,shop_id,name,description,price_usd,image_url,is_active,created_at,updated_at")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  if (productsError || !productRows) {
    return serverErrorResponse(productsError, "No se pudieron cargar tus productos.");
  }

  const products = productRows as ProductRow[];

  const subscription = await getVendorSubscriptionByShopId(dataClient, shop.id);
  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";
  const productLimit = hasActiveSubscription ? null : VENDOR_FREE_TIER_PRODUCT_LIMIT;

  if (products.length === 0) {
    return NextResponse.json({ products: [], productLimit, productCount: 0 });
  }

  const productIds = products.map((row) => row.id);

  const [{ data: variantRows, error: variantsError }, { data: imageRows, error: imagesError }] =
    await Promise.all([
      dataClient
        .from("product_variants")
        .select(
          "id,product_id,title,sku,attributes_json,price_usd,stock_qty,is_active,created_at,updated_at",
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: true }),
      dataClient
        .from("product_images")
        .select("id,product_id,image_url,alt,sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
    ]);

  if (variantsError || !variantRows) {
    return serverErrorResponse(variantsError, "No se pudieron cargar variantes.");
  }

  if (imagesError || !imageRows) {
    return serverErrorResponse(imagesError, "No se pudieron cargar imagenes.");
  }

  return NextResponse.json({
    products: mapProductResponse(
      products,
      variantRows as VariantRow[],
      imageRows as ImageRow[],
    ),
    productLimit,
    productCount: products.length,
  });
}

export async function POST(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const body = await parseJsonBody<ProductPayload>(request);
  if (!body || !isRecord(body)) {
    return badRequestResponse("Cuerpo invalido.");
  }

  const name = readText(body.name);
  if (!name) {
    return badRequestResponse("El nombre del producto es requerido.");
  }

  if (name.length > 200) {
    return NextResponse.json(
      { error: "El nombre del producto no puede exceder 200 caracteres." },
      { status: 400 },
    );
  }

  const description = readText(body.description);

  if (description && description.length > 5000) {
    return NextResponse.json(
      { error: "La descripción no puede exceder 5,000 caracteres." },
      { status: 400 },
    );
  }
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const images =
    Array.isArray(body.images)
      ? body.images.flatMap((image) => {
          if (!isRecord(image)) {
            return [];
          }

          const nextImageUrl =
            typeof image.imageUrl === "string" ? image.imageUrl.trim() : "";

          if (!nextImageUrl) {
            return [];
          }

          const nextAlt = typeof image.alt === "string" ? image.alt.trim() : "";

          return [
            {
              imageUrl: nextImageUrl,
              alt: nextAlt || null,
            },
          ];
        })
      : [];
  const isActive = body.isActive ?? true;
  const rawVariant = isRecord(body.variant) ? body.variant : {};

  const variantTitle = readText(rawVariant.title) || "Default";
  const variantSku = readText(rawVariant.sku);
  const variantPrice = Math.max(0, readNumeric(rawVariant.priceUsd, 0));
  const rawStock = rawVariant.stockQty;
  const variantStock =
    rawStock === null || rawStock === undefined || rawStock === ""
      ? null
      : Math.max(0, Math.trunc(readNumeric(rawStock, 0)));
  const variantIsActive = rawVariant.isActive ?? true;
  const variantAttributes = isRecord(rawVariant.attributes)
    ? rawVariant.attributes
    : {};
  const imagesToInsert =
    images.length > 0
      ? images
      : imageUrl
        ? [{ imageUrl, alt: name }]
        : [];
  if (imagesToInsert.length === 0) {
    return NextResponse.json(
      { error: "Se requiere al menos una imagen." },
      { status: 400 }
    );
  }
  const primaryImageUrl = imagesToInsert[0]?.imageUrl ?? null;

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);

    const subscription = await getVendorSubscriptionByShopId(dataClient, shop.id);
    const hasActiveSubscription =
      subscription?.status === "active" || subscription?.status === "trialing";

    if (!hasActiveSubscription) {
      const { count } = await dataClient
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shop.id);

      if ((count ?? 0) >= VENDOR_FREE_TIER_PRODUCT_LIMIT) {
        return NextResponse.json(
          {
            error: `Has alcanzado el límite de ${VENDOR_FREE_TIER_PRODUCT_LIMIT} productos del plan gratuito. Suscríbete al Plan Vendedor ($10/mes) para productos ilimitados.`,
            upgradeRequired: true,
          },
          { status: 403 },
        );
      }
    }

    const { data: productRow, error: productError } = await dataClient
      .from("products")
      .insert({
        shop_id: shop.id,
        name,
        description,
        price_usd: variantPrice,
        image_url: primaryImageUrl,
        is_active: isActive,
      })
      .select(
        "id,shop_id,name,description,price_usd,image_url,is_active,created_at,updated_at",
      )
      .single();

    if (productError || !productRow) {
      throw new Error(productError?.message ?? "No se pudo crear el producto.");
    }

    const { error: variantError } = await dataClient.from("product_variants").insert({
      product_id: productRow.id,
      title: variantTitle,
      sku: variantSku || null,
      attributes_json: variantAttributes,
      price_usd: variantPrice,
      stock_qty: variantStock,
      is_active: variantIsActive,
    });

    if (variantError) {
      throw new Error(variantError.message);
    }

    if (imagesToInsert.length > 0) {
      const { error: imageError } = await dataClient.from("product_images").insert(
        imagesToInsert.map((image, index) => ({
          product_id: productRow.id,
          image_url: image.imageUrl,
          alt: image.alt ?? name,
          sort_order: index,
        })),
      );

      if (imageError) {
        throw new Error(imageError.message);
      }
    }

    return NextResponse.json(
      {
        product: {
          id: productRow.id,
          name: productRow.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return serverErrorResponse(error, "No se pudo crear el producto.");
  }
}
