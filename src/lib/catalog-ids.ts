export function createCatalogProductKey(shopSlug: string, productId: string) {
  return `${shopSlug}:${productId}`;
}
