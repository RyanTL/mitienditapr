import { unstable_noStore as noStore } from "next/cache";

import { mockShopDetails } from "@/lib/mock-shop-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildMarketplaceSearchShops,
  buildMarketplaceShopCards,
  buildShopDetail,
  type MarketplaceSearchShop,
  type ProductRow,
  type ShopRow,
} from "@/lib/supabase/public-shop-data-shared";
import type { ShopDetail } from "@/lib/supabase/shop-types";

function shouldUseMockFallback(error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("enotfound") ||
    message.includes("eai_again")
  );
}

function buildMarketplaceFromMockData() {
  const searchShops = mockShopDetails.map((shop) => ({
    id: shop.slug,
    slug: shop.slug,
    name: shop.vendorName,
    rating: shop.rating,
    reviewCount: shop.reviewCount,
    products: shop.products.map((product) => ({
      id: product.id,
      name: product.name,
      priceUsd: product.priceUsd,
      rating: product.rating,
      reviewCount: product.reviewCount,
      imageUrl: product.imageUrl,
      alt: product.alt,
    })),
  }));

  return {
    searchShops,
    shopCards: buildMarketplaceShopCards(searchShops),
  };
}

function getMockShopDetailBySlug(shopSlug: string): ShopDetail | null {
  return mockShopDetails.find((shop) => shop.slug === shopSlug) ?? null;
}

export async function fetchMarketplaceHomeDataServer(): Promise<{
  searchShops: MarketplaceSearchShop[];
  shopCards: ReturnType<typeof buildMarketplaceShopCards>;
}> {
  noStore();
  try {
    const supabase = await createSupabaseServerClient();
    const { data: shopsData, error: shopsError } = await supabase
      .from("shops")
      .select("id,slug,vendor_name,rating,review_count,description,is_active,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,ath_movil_phone,contact_phone,contact_instagram,contact_facebook,contact_whatsapp")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40);

    if (shopsError) {
      throw new Error(shopsError.message);
    }

    const shops = (shopsData as ShopRow[] | null) ?? [];
    if (shops.length === 0) {
      return {
        searchShops: [],
        shopCards: [],
      };
    }

    const shopIds = shops.map((shop) => shop.id);
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id,shop_id,name,description,price_usd,rating,review_count,image_url,is_active")
      .in("shop_id", shopIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (productsError) {
      throw new Error(productsError.message);
    }

    const searchShops = buildMarketplaceSearchShops(
      shops,
      (productsData as ProductRow[] | null) ?? [],
    );

    return {
      searchShops,
      shopCards: buildMarketplaceShopCards(searchShops),
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return buildMarketplaceFromMockData();
    }
    throw error;
  }
}

export async function fetchShopDetailBySlugServer(shopSlug: string) {
  noStore();
  try {
    const supabase = await createSupabaseServerClient();
    const { data: shopData, error: shopError } = await supabase
      .from("shops")
      .select("id,slug,vendor_name,rating,review_count,description,is_active,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,ath_movil_phone,contact_phone,contact_instagram,contact_facebook,contact_whatsapp")
      .eq("slug", shopSlug)
      .maybeSingle();

    if (shopError) {
      throw new Error(shopError.message);
    }

    if (!shopData) {
      return null;
    }

    const shop = shopData as ShopRow;
    if (!shop.is_active) {
      return null;
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id,shop_id,name,description,price_usd,rating,review_count,image_url,is_active")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (productsError) {
      throw new Error(productsError.message);
    }

    return buildShopDetail(shop, (productsData as ProductRow[] | null) ?? []);
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return getMockShopDetailBySlug(shopSlug);
    }
    throw error;
  }
}
