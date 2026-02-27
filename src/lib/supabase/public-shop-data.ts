import { getShopBySlug } from "@/lib/mock-shop-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildShopDetail,
  type ProductRow,
  type ShopRow,
} from "@/lib/supabase/public-shop-data-shared";

export async function fetchShopDetailBySlugServer(shopSlug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: shopData, error: shopError } = await supabase
    .from("shops")
    .select("id,slug,vendor_name,rating,review_count,description,is_active")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (shopError || !shopData || !(shopData as ShopRow).is_active) {
    return getShopBySlug(shopSlug) ?? null;
  }

  const shop = shopData as ShopRow;
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id,name,description,price_usd,rating,review_count,image_url,is_active")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (productsError || !productsData) {
    return buildShopDetail(shop, []);
  }

  return buildShopDetail(shop, productsData as ProductRow[]);
}
