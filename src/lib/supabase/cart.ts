"use client";

import { getCatalogProductDatabaseId } from "@/lib/catalog-ids";
import {
  getCatalogProductDatabaseIdFromRoute,
  getCatalogProductIdentityFromDatabaseId,
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

function notifyCartChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
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

  await ensureCatalogSeeded();

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

    const shop = shopById.get(product.shop_id);
    if (!shop) {
      return [];
    }

    const identity = getCatalogProductIdentityFromDatabaseId(product.id);
    const productId = identity?.productId ?? product.id;
    const shopSlug = identity?.shopSlug ?? shop.slug;

    return [
      {
        id: cartItem.id,
        quantity: cartItem.quantity,
        product: {
          databaseId: product.id,
          shopId: product.shop_id,
          shopSlug,
          shopName: shop.vendor_name,
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

export async function addProductToCart(
  shopSlug: string,
  productId: string,
  quantityToAdd = 1,
) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  await ensureCatalogSeeded();

  const databaseProductId =
    getCatalogProductDatabaseIdFromRoute(shopSlug, productId) ??
    getCatalogProductDatabaseId(shopSlug, productId);

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
      quantity: item.quantity,
      unit_price_usd: item.product.priceUsd,
    })),
  );

  if (createOrderItemsError) {
    throw new Error(createOrderItemsError.message);
  }

  const cartItemIds = shopCartItems.map((item) => item.id);
  const { error: clearCartError } = await supabase
    .from("cart_items")
    .delete()
    .eq("profile_id", profileId)
    .in("id", cartItemIds);

  if (clearCartError) {
    throw new Error(clearCartError.message);
  }

  notifyCartChanged();

  return {
    ok: true as const,
    unauthorized: false as const,
    empty: false as const,
    orderId: orderRow.id,
  };
}
