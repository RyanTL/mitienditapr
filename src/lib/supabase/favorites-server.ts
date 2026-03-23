import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FavoriteProduct } from "@/lib/supabase/favorites";

type FavoriteWithRelations = {
  product_id: string;
  products: {
    id: string;
    shop_id: string;
    name: string;
    price_usd: number;
    image_url: string;
    shops: {
      id: string;
      slug: string;
      vendor_name: string;
    } | null;
  } | null;
};

/** Server-side favorites fetch — single joined query, no client-side waterfall. */
export async function fetchFavoriteProductsServer(): Promise<FavoriteProduct[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("product_id, products(id, shop_id, name, price_usd, image_url, shops(id, slug, vendor_name))")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as FavoriteWithRelations[]).flatMap((row) => {
    const product = row.products;
    if (!product) return [];

    const shop = product.shops;
    if (!shop) return [];

    return [
      {
        id: `${shop.slug}:${product.id}`,
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
