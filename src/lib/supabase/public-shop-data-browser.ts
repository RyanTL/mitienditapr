"use client";

import { marketplaceShopCards, mockShopDetails } from "@/lib/mock-shop-data";
import { ensureCatalogSeeded } from "@/lib/supabase/catalog-seed-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildShopCard,
  type ProductRow,
  type ShopRow,
} from "@/lib/supabase/public-shop-data-shared";

export type MarketplaceSearchProduct = {
  id: string;
  name: string;
  imageUrl: string;
  alt: string;
};

export type MarketplaceSearchShop = {
  id: string;
  slug: string;
  name: string;
  rating: string;
  reviewCount: number;
  products: MarketplaceSearchProduct[];
};

function mapMockSearchShops() {
  return mockShopDetails.map((shop) => ({
    id: shop.slug,
    slug: shop.slug,
    name: shop.vendorName,
    rating: shop.rating,
    reviewCount: shop.reviewCount,
    products: shop.products.map((product) => ({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      alt: product.alt,
    })),
  }));
}

function mapSearchShopsFromRows(shops: ShopRow[], products: ProductRow[]) {
  return shops.map((shop) => ({
    id: shop.id,
    slug: shop.slug,
    name: shop.vendor_name,
    rating: Number(shop.rating ?? 0).toFixed(1),
    reviewCount: Number(shop.review_count ?? 0),
    products: products
      .filter((product) => product.shop_id === shop.id)
      .map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.image_url || "",
        alt: product.name,
      })),
  }));
}

export async function fetchMarketplaceSearchShopsBrowser() {
  try {
    await ensureCatalogSeeded();
  } catch {
    // Ignore seed errors for anonymous visitors.
  }

  const supabase = createSupabaseBrowserClient();
  const { data: shopsData, error: shopsError } = await supabase
    .from("shops")
    .select("id,slug,vendor_name,rating,review_count,description,is_active")
    .order("created_at", { ascending: false })
    .limit(40);

  if (shopsError || !shopsData || shopsData.length === 0) {
    return mapMockSearchShops();
  }

  const shops = (shopsData as ShopRow[]).filter((shop) => shop.is_active);
  if (shops.length === 0) {
    return mapMockSearchShops();
  }

  const shopIds = shops.map((shop) => shop.id);
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id,name,description,price_usd,image_url,is_active")
    .in("shop_id", shopIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (productsError || !productsData) {
    return mapSearchShopsFromRows(shops, []);
  }

  return mapSearchShopsFromRows(shops, productsData as ProductRow[]);
}

export function mapSearchShopsToCards(searchShops: MarketplaceSearchShop[]) {
  if (searchShops.length === 0) {
    return marketplaceShopCards;
  }

  return searchShops.map((shop) =>
    buildShopCard(
      {
        id: shop.id,
        slug: shop.slug,
        vendor_name: shop.name,
        rating: Number(shop.rating),
        review_count: shop.reviewCount,
        description: "",
        is_active: true,
      },
      shop.products.map((product) => ({
        id: product.id,
        shop_id: shop.id,
        name: product.name,
        description: "",
        price_usd: 0,
        image_url: product.imageUrl || null,
        is_active: true,
      })),
    ),
  );
}

export async function fetchMarketplaceShopCardsBrowser() {
  const searchShops = await fetchMarketplaceSearchShopsBrowser();
  return mapSearchShopsToCards(searchShops);
}
