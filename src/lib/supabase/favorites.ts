"use client";

import { createCatalogProductKey, getCatalogProductDatabaseId } from "@/lib/catalog-ids";
import {
  getCatalogProductIdentityFromDatabaseId,
  getCatalogProductDatabaseIdFromRoute,
} from "@/lib/catalog-mapping";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCatalogSeeded } from "@/lib/supabase/catalog-seed-client";

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
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function fetchFavoriteProducts() {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return [] as FavoriteProduct[];
  }

  await ensureCatalogSeeded();

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
    const identity = getCatalogProductIdentityFromDatabaseId(productId);
    const product = productById.get(productId);
    if (!identity || !product) {
      return [];
    }

    const shop = shopById.get(product.shop_id);
    if (!shop) {
      return [];
    }

    return [
      {
        id: createCatalogProductKey(identity.shopSlug, identity.productId),
        shopSlug: shop.slug,
        shopName: shop.vendor_name,
        productId: identity.productId,
        productName: product.name,
        priceUsd: Number(product.price_usd),
        imageUrl: product.image_url,
        alt: product.name,
      } satisfies FavoriteProduct,
    ];
  });
}

export async function upsertFavoriteProduct(shopSlug: string, productId: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  await ensureCatalogSeeded();

  const databaseProductId =
    getCatalogProductDatabaseIdFromRoute(shopSlug, productId) ??
    getCatalogProductDatabaseId(shopSlug, productId);

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("favorites").upsert(
    {
      profile_id: profileId,
      product_id: databaseProductId,
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

export async function deleteFavoriteProduct(shopSlug: string, productId: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const databaseProductId =
    getCatalogProductDatabaseIdFromRoute(shopSlug, productId) ??
    getCatalogProductDatabaseId(shopSlug, productId);

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("profile_id", profileId)
    .eq("product_id", databaseProductId);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true as const, unauthorized: false as const };
}
