import type { MarketplaceSearchShop } from "@/lib/supabase/public-shop-data-shared";

export function normalizeMarketplaceSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function includesMarketplaceSearchText(
  value: string,
  normalizedQuery: string,
) {
  return normalizeMarketplaceSearchText(value).includes(normalizedQuery);
}

export function filterMarketplaceShopsByQuery(
  shops: MarketplaceSearchShop[],
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return shops;
  }

  return shops.filter(
    (shop) =>
      includesMarketplaceSearchText(shop.name, normalizedQuery) ||
      shop.products.some((product) =>
        includesMarketplaceSearchText(product.name, normalizedQuery),
      ),
  );
}
