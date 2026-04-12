import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildMarketplaceSearchShops,
  buildMarketplaceShopCards,
  buildShopDetail,
  type MarketplaceSearchShop,
  type ProductRow,
  type ShopRow,
} from "@/lib/supabase/public-shop-data-shared";

export async function fetchMarketplaceHomeDataServer(): Promise<{
  searchShops: MarketplaceSearchShop[];
  shopCards: ReturnType<typeof buildMarketplaceShopCards>;
}> {
  noStore();

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
}

export async function fetchShopDetailBySlugServer(shopSlug: string) {
  noStore();

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
}
