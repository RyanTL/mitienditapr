"use client";

import { FALLBACK_PRODUCT_IMAGE as CART_IMAGE_FALLBACK_URL } from "@/lib/formatters";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentProfileId } from "@/lib/supabase/favorites";

export const CART_CHANGED_EVENT = "mitienditapr:cart-changed";

export type CartChangedEventDetail = { delta: number } | { fullRefresh: true };

export type CartItem = {
  id: string;
  quantity: number;
  product: {
    databaseId: string;
    shopId: string;
    shopSlug: string;
    shopName: string;
    shopAthMovilPhone: string | null;
    shopContactPhone: string | null;
    shopContactInstagram: string | null;
    shopContactFacebook: string | null;
    shopContactWhatsapp: string | null;
    shopShippingFlatFeeUsd: number;
    shopOffersPickup: boolean;
    shopAcceptsStripePayments: boolean;
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
  shipping_flat_fee_usd: number;
  offers_pickup: boolean;
  stripe_connect_account_id: string | null;
  ath_movil_phone: string | null;
  contact_phone: string | null;
  contact_instagram: string | null;
  contact_facebook: string | null;
  contact_whatsapp: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value: string) {
  return UUID_PATTERN.test(value);
}

function notifyCartChanged(detail: CartChangedEventDetail = { fullRefresh: true }) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<CartChangedEventDetail>(CART_CHANGED_EVENT, { detail }));
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
    .select(
      "id,slug,vendor_name,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,ath_movil_phone,contact_phone,contact_instagram,contact_facebook,contact_whatsapp",
    )
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

    return [
      {
        id: cartItem.id,
        quantity: cartItem.quantity,
        product: {
          databaseId: product.id,
          shopId: product.shop_id,
          shopSlug: shop.slug,
          shopName: shop.vendor_name,
          shopAthMovilPhone: shop.ath_movil_phone ?? null,
          shopContactPhone: shop.contact_phone ?? null,
          shopContactInstagram: shop.contact_instagram ?? null,
          shopContactFacebook: shop.contact_facebook ?? null,
          shopContactWhatsapp: shop.contact_whatsapp ?? null,
          shopShippingFlatFeeUsd: Number(shop.shipping_flat_fee_usd ?? 0),
          shopOffersPickup: Boolean(shop.offers_pickup),
          shopAcceptsStripePayments: Boolean(shop.stripe_connect_account_id),
          productId: product.id,
          name: product.name,
          priceUsd: Number(product.price_usd),
          imageUrl: product.image_url || CART_IMAGE_FALLBACK_URL,
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
    return null;
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

  return null;
}

export async function addProductToCart(
  _shopSlug: string,
  productId: string,
  quantityToAdd = 1,
) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const normalizedProductId = productId.trim();
  if (!isUuidLike(normalizedProductId)) {
    throw new Error("ID de producto invalido.");
  }

  const supabase = createSupabaseBrowserClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from("cart_items")
    .select("id,quantity")
    .eq("profile_id", profileId)
    .eq("product_id", normalizedProductId)
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
      product_id: normalizedProductId,
      quantity: Math.max(1, quantityToAdd),
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

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
