"use client";

import {
  getCatalogProductIdentityFromDatabaseId,
  isUuidLike,
  resolveProductDatabaseId,
} from "@/lib/catalog-mapping";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCatalogSeeded } from "@/lib/supabase/catalog-seed-client";
import { getCurrentProfileId } from "@/lib/supabase/favorites";

export const CART_CHANGED_EVENT = "mitienditapr:cart-changed";

export type CartItem = {
  id: string;
  quantity: number;
  product: {
    databaseId: string;
    shopId: string;
    shopSlug: string;
    shopName: string;
    productId: string;
    name: string;
    priceUsd: number;
    imageUrl: string;
    alt: string;
  };
};

type CartItemRow = {
  id: string;
  product_id: string;
  quantity: number;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  price_usd: number;
  image_url: string;
};

type ShopRow = {
  id: string;
  slug: string;
  vendor_name: string;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
};

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
} | null;

function notifyCartChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

function isMissingProductVariantsTableError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const content = [
    error.message ?? "",
    error.details ?? "",
    error.hint ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    error.code === "PGRST205" &&
    content.includes("product_variants") &&
    content.includes("schema cache")
  );
}

async function cleanupOrderAfterCheckoutFailure(
  profileId: string,
  orderId: string,
  fallbackMessage: string,
) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("profile_id", profileId);

  if (!error) {
    throw new Error(fallbackMessage);
  }

  throw new Error(`${fallbackMessage} (Rollback fallido: ${error.message})`);
}

export async function fetchCartQuantityTotal() {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return 0;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: cartRows, error } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("profile_id", profileId);

  if (error || !cartRows) {
    throw new Error(error?.message ?? "No se pudo cargar la cantidad del carrito.");
  }

  return cartRows.reduce((total, item) => total + item.quantity, 0);
}

export async function fetchCartItems() {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return [] as CartItem[];
  }

  try {
    await ensureCatalogSeeded();
  } catch (error) {
    // Seed is only required for mock catalog IDs; ignore failures for real DB products.
    console.error("No se pudo sincronizar el catalogo del carrito:", error);
  }

  const supabase = createSupabaseBrowserClient();
  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("id,product_id,quantity")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (cartError || !cartRows) {
    throw new Error(cartError?.message ?? "No se pudo cargar el carrito.");
  }

  const typedCartRows = cartRows as CartItemRow[];
  const productIds = typedCartRows.map((item) => item.product_id);
  if (productIds.length === 0) {
    return [];
  }

  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id,name,price_usd,image_url")
    .in("id", productIds);

  if (productsError || !productRows) {
    throw new Error(productsError?.message ?? "No se pudieron cargar productos.");
  }

  const typedProducts = productRows as ProductRow[];
  const shopIds = Array.from(
    new Set(typedProducts.map((product) => product.shop_id)),
  );
  if (shopIds.length === 0) {
    return [];
  }

  const { data: shopRows, error: shopsError } = await supabase
    .from("shops")
    .select("id,slug,vendor_name")
    .in("id", shopIds);

  if (shopsError || !shopRows) {
    throw new Error(shopsError?.message ?? "No se pudieron cargar tiendas.");
  }

  const productById = new Map(
    typedProducts.map((product) => [product.id, product]),
  );
  const shopById = new Map((shopRows as ShopRow[]).map((shop) => [shop.id, shop]));

  return typedCartRows.flatMap((cartItem) => {
    const product = productById.get(cartItem.product_id);
    if (!product) {
      return [];
    }

    const identity = getCatalogProductIdentityFromDatabaseId(product.id);
    const shop = shopById.get(product.shop_id);
    const shopSlug = identity?.shopSlug ?? shop?.slug ?? "";
    const productId = identity?.productId ?? product.id;
    const fallbackShopName =
      identity?.shopSlug
        ?.split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") ?? "Tienda";

    return [
      {
        id: cartItem.id,
        quantity: cartItem.quantity,
        product: {
          databaseId: product.id,
          shopId: product.shop_id,
          shopSlug,
          shopName: shop?.vendor_name ?? fallbackShopName,
          productId,
          name: product.name,
          priceUsd: Number(product.price_usd),
          imageUrl: product.image_url,
          alt: product.name,
        },
      } satisfies CartItem,
    ];
  });
}

export async function fetchPrimaryCartShopSlug() {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return null;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: cartRow, error: cartError } = await supabase
    .from("cart_items")
    .select("product_id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ product_id: string }>();

  if (cartError) {
    throw new Error(cartError.message);
  }

  if (!cartRow) {
    return null;
  }

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select("shop_id")
    .eq("id", cartRow.product_id)
    .maybeSingle<{ shop_id: string }>();

  if (productError) {
    throw new Error(productError.message);
  }

  if (!productRow) {
    const identity = getCatalogProductIdentityFromDatabaseId(cartRow.product_id);
    return identity?.shopSlug ?? null;
  }

  const { data: shopRow, error: shopError } = await supabase
    .from("shops")
    .select("slug")
    .eq("id", productRow.shop_id)
    .maybeSingle<{ slug: string }>();

  if (shopError) {
    throw new Error(shopError.message);
  }

  if (shopRow?.slug) {
    return shopRow.slug;
  }

  const identity = getCatalogProductIdentityFromDatabaseId(cartRow.product_id);
  return identity?.shopSlug ?? null;
}

export async function addProductToCart(
  shopSlug: string,
  productId: string,
  quantityToAdd = 1,
) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  if (!isUuidLike(productId)) {
    await ensureCatalogSeeded();
  }

  const databaseProductId =
    resolveProductDatabaseId(shopSlug, productId);

  const supabase = createSupabaseBrowserClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from("cart_items")
    .select("id,quantity")
    .eq("profile_id", profileId)
    .eq("product_id", databaseProductId)
    .maybeSingle();

  if (existingItemError) {
    throw new Error(existingItemError.message);
  }

  if (existingItem) {
    const nextQuantity = Math.max(1, existingItem.quantity + quantityToAdd);
    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity: nextQuantity })
      .eq("id", existingItem.id)
      .eq("profile_id", profileId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase.from("cart_items").insert({
      profile_id: profileId,
      product_id: databaseProductId,
      quantity: Math.max(1, quantityToAdd),
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  notifyCartChanged();

  return { ok: true as const, unauthorized: false as const };
}

export async function setCartItemQuantity(cartItemId: string, quantity: number) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const supabase = createSupabaseBrowserClient();

  if (quantity <= 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .eq("profile_id", profileId);

    if (error) {
      throw new Error(error.message);
    }

    notifyCartChanged();

    return { ok: true as const, unauthorized: false as const };
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  notifyCartChanged();

  return { ok: true as const, unauthorized: false as const };
}

export async function removeCartItem(cartItemId: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  notifyCartChanged();

  return { ok: true as const, unauthorized: false as const };
}

export async function checkoutCartByShop(shopSlug: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const, empty: false as const };
  }

  const cartItems = await fetchCartItems();
  const shopCartItems = cartItems.filter((item) => item.product.shopSlug === shopSlug);

  if (shopCartItems.length === 0) {
    return { ok: false as const, unauthorized: false as const, empty: true as const };
  }

  const subtotal = shopCartItems.reduce(
    (total, item) => total + item.product.priceUsd * item.quantity,
    0,
  );

  const supabase = createSupabaseBrowserClient();
  const productIds = Array.from(
    new Set(shopCartItems.map((item) => item.product.databaseId)),
  );
  let firstVariantIdByProductId = new Map<string, string>();

  if (productIds.length > 0) {
    const { data: variantRows, error: variantsError } = await supabase
      .from("product_variants")
      .select("id,product_id")
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (variantsError && !isMissingProductVariantsTableError(variantsError)) {
      throw new Error(variantsError.message);
    }

    if (variantRows && !variantsError) {
      firstVariantIdByProductId = (variantRows as ProductVariantRow[]).reduce(
        (map, row) => {
          if (!map.has(row.product_id)) {
            map.set(row.product_id, row.id);
          }
          return map;
        },
        new Map<string, string>(),
      );
    }
  }

  const { data: orderRow, error: createOrderError } = await supabase
    .from("orders")
    .insert({
      profile_id: profileId,
      status: "pending",
      subtotal_usd: subtotal,
      total_usd: subtotal,
    })
    .select("id")
    .single();

  if (createOrderError || !orderRow) {
    throw new Error(createOrderError?.message ?? "No se pudo crear la orden.");
  }

  const { error: createOrderItemsError } = await supabase.from("order_items").insert(
    shopCartItems.map((item) => ({
      order_id: orderRow.id,
      product_id: item.product.databaseId,
      product_variant_id: firstVariantIdByProductId.get(item.product.databaseId) ?? null,
      quantity: item.quantity,
      unit_price_usd: item.product.priceUsd,
    })),
  );

  if (createOrderItemsError) {
    await cleanupOrderAfterCheckoutFailure(
      profileId,
      orderRow.id,
      `No se pudo crear los items de la orden: ${createOrderItemsError.message}`,
    );
  }

  const cartItemIds = shopCartItems.map((item) => item.id);
  const { error: clearCartError } = await supabase
    .from("cart_items")
    .delete()
    .eq("profile_id", profileId)
    .in("id", cartItemIds);

  if (clearCartError) {
    await cleanupOrderAfterCheckoutFailure(
      profileId,
      orderRow.id,
      `No se pudo limpiar el carrito: ${clearCartError.message}`,
    );
  }

  notifyCartChanged();

  return {
    ok: true as const,
    unauthorized: false as const,
    empty: false as const,
    orderId: orderRow.id,
  };
}
