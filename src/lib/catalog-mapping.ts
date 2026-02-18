import { getCatalogProductDatabaseId, createCatalogProductKey } from "@/lib/catalog-ids";
import { mockShopDetails } from "@/lib/mock-shop-data";

export type CatalogProductIdentity = {
  shopSlug: string;
  productId: string;
};

const catalogProductDatabaseIdByKey = new Map<string, string>();
const catalogProductIdentityByDatabaseId = new Map<string, CatalogProductIdentity>();

mockShopDetails.forEach((shop) => {
  shop.products.forEach((product) => {
    const key = createCatalogProductKey(shop.slug, product.id);
    const databaseId = getCatalogProductDatabaseId(shop.slug, product.id);

    catalogProductDatabaseIdByKey.set(key, databaseId);
    catalogProductIdentityByDatabaseId.set(databaseId, {
      shopSlug: shop.slug,
      productId: product.id,
    });
  });
});

export function getCatalogProductDatabaseIdByKey(key: string) {
  return catalogProductDatabaseIdByKey.get(key) ?? null;
}

export function getCatalogProductDatabaseIdFromRoute(shopSlug: string, productId: string) {
  const key = createCatalogProductKey(shopSlug, productId);
  return getCatalogProductDatabaseIdByKey(key);
}

export function getCatalogProductIdentityFromDatabaseId(databaseId: string) {
  return catalogProductIdentityByDatabaseId.get(databaseId) ?? null;
}
