import { getCatalogProductDatabaseId, getCatalogShopDatabaseId } from "@/lib/catalog-ids";
import { mockShopDetails } from "@/lib/mock-shop-data";

type SeedShopRow = {
  id: string;
  slug: string;
  vendor_profile_id: string;
  vendor_name: string;
  description: string;
  rating: number;
  review_count: number;
  is_active: boolean;
};

type SeedProductRow = {
  id: string;
  shop_slug: string;
  name: string;
  description: string;
  price_usd: number;
  image_url: string;
  is_active: boolean;
};

export function buildCatalogSeedRows(ownerProfileId: string) {
  const shops: SeedShopRow[] = mockShopDetails.map((shop) => ({
    id: getCatalogShopDatabaseId(shop.slug),
    slug: shop.slug,
    vendor_profile_id: ownerProfileId,
    vendor_name: shop.vendorName,
    description: shop.description,
    rating: Number(shop.rating),
    review_count: shop.reviewCount,
    is_active: true,
  }));

  const products: SeedProductRow[] = mockShopDetails.flatMap((shop) =>
    shop.products.map((product) => ({
      id: getCatalogProductDatabaseId(shop.slug, product.id),
      shop_slug: shop.slug,
      name: product.name,
      description: product.description,
      price_usd: product.priceUsd,
      image_url: product.imageUrl,
      is_active: true,
    })),
  );

  return { shops, products };
}
