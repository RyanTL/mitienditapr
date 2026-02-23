import { NextResponse } from "next/server";

import { buildCatalogSeedRows } from "@/lib/supabase/catalog-seed";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

type ShopIdRow = {
  id: string;
  slug: string;
};

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { shops, products } = buildCatalogSeedRows(user.id);

  const { error: upsertShopsError } = await admin
    .from("shops")
    .upsert(shops, { onConflict: "id", ignoreDuplicates: true });

  if (upsertShopsError && upsertShopsError.code !== "23505") {
    return NextResponse.json(
      { error: upsertShopsError.message },
      { status: 500 },
    );
  }

  const shopSlugs = shops.map((shop) => shop.slug);
  const { data: shopRows, error: fetchShopsError } = await admin
    .from("shops")
    .select("id,slug")
    .in("slug", shopSlugs);

  if (fetchShopsError || !shopRows) {
    return NextResponse.json(
      { error: fetchShopsError?.message ?? "No se pudieron cargar las tiendas." },
      { status: 500 },
    );
  }

  const shopIdBySlug = new Map<string, string>();
  (shopRows as ShopIdRow[]).forEach((shopRow) => {
    shopIdBySlug.set(shopRow.slug, shopRow.id);
  });

  const productRows = products
    .map((product) => {
      const shopId = shopIdBySlug.get(product.shop_slug);
      if (!shopId) {
        return null;
      }

      return {
        id: product.id,
        shop_id: shopId,
        name: product.name,
        description: product.description,
        price_usd: product.price_usd,
        image_url: product.image_url,
        is_active: product.is_active,
      };
    })
    .filter((product): product is NonNullable<typeof product> => product !== null);

  const { error: upsertProductsError } = await admin
    .from("products")
    .upsert(productRows, { onConflict: "id" });

  if (upsertProductsError) {
    return NextResponse.json(
      { error: upsertProductsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    shopsSeeded: shops.length,
    productsSeeded: productRows.length,
  });
}
