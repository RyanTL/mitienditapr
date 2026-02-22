"use client";

import { marketplaceShopCards } from "@/lib/mock-shop-data";
import { ensureCatalogSeeded } from "@/lib/supabase/catalog-seed-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildShopCard,
  type ProductRow,
  type ShopRow,
} from "@/lib/supabase/public-shop-data-shared";

export async function fetchMarketplaceShopCardsBrowser() {
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
    return marketplaceShopCards;
  }

  const shops = (shopsData as ShopRow[]).filter((shop) => shop.is_active);
  if (shops.length === 0) {
    return marketplaceShopCards;
  }

  const shopIds = shops.map((shop) => shop.id);
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id,name,description,price_usd,image_url,is_active")
    .in("shop_id", shopIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (productsError || !productsData) {
    return shops.map((shop) => buildShopCard(shop, []));
  }

  return shops.map((shop) => buildShopCard(shop, productsData as ProductRow[]));
}
