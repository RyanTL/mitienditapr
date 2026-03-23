"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type FavoriteProduct = {
  id: string;
  shopSlug: string;
  shopName: string;
  productId: string;
  productName: string;
  priceUsd: number;
  imageUrl: string;
  alt: string;
};

type FavoriteRow = {
  product_id: string;
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

export async function getCurrentProfileId() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user.id ?? null;
}

export async function fetchFavoriteProducts() {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return [] as FavoriteProduct[];
  }

  const supabase = createSupabaseBrowserClient();
  const { data: favoriteRows, error: favoritesError } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (favoritesError || !favoriteRows) {
    throw new Error(favoritesError?.message ?? "No se pudieron cargar favoritos.");
  }

  const productIds = (favoriteRows as FavoriteRow[]).map((favorite) => favorite.product_id);
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
  const shopById = new Map(
    (shopRows as ShopRow[]).map((shop) => [shop.id, shop]),
  );

  return productIds.flatMap((productId) => {
    const product = productById.get(productId);
    if (!product) {
      return [];
    }

    const shop = shopById.get(product.shop_id);
    if (!shop) {
      return [];
    }

    const favoriteId = `${shop.slug}:${product.id}`;

    return [
      {
        id: favoriteId,
        shopSlug: shop.slug,
        shopName: shop.vendor_name,
        productId: product.id,
        productName: product.name,
        priceUsd: Number(product.price_usd),
        imageUrl: product.image_url,
        alt: product.name,
      } satisfies FavoriteProduct,
    ];
  });
}

export async function upsertFavoriteProduct(_shopSlug: string, productId: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const normalizedProductId = productId.trim();
  if (!normalizedProductId) {
    throw new Error("Producto invalido.");
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("favorites").upsert(
    {
      profile_id: profileId,
      product_id: normalizedProductId,
    },
    {
      onConflict: "profile_id,product_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true as const, unauthorized: false as const };
}

export async function deleteFavoriteProduct(_shopSlug: string, productId: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const normalizedProductId = productId.trim();
  if (!normalizedProductId) {
    throw new Error("Producto invalido.");
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("profile_id", profileId)
    .eq("product_id", normalizedProductId);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true as const, unauthorized: false as const };
}
