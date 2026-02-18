export const FAVORITES_STORAGE_KEY = "mitienditapr.favorite-products";
export const FAVORITES_CHANGED_EVENT = "mitienditapr:favorites-changed";

export type FavoriteProduct = {
  id: string;
  shopSlug: string;
  shopName: string;
  productId: string;
  productName: string;
  priceUsd: number;
  imageUrl: string;
  alt: string;
};

type FavoriteProductInput = Omit<FavoriteProduct, "id">;

function isBrowser() {
  return typeof window !== "undefined";
}

export function buildFavoriteProductId(shopSlug: string, productId: string) {
  return `${shopSlug}:${productId}`;
}

export function createFavoriteProduct(
  input: FavoriteProductInput,
): FavoriteProduct {
  return {
    ...input,
    id: buildFavoriteProductId(input.shopSlug, input.productId),
  };
}

export function getFavoriteProducts(): FavoriteProduct[] {
  if (!isBrowser()) {
    return [];
  }

  const rawFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!rawFavorites) {
    return [];
  }

  try {
    const parsedFavorites = JSON.parse(rawFavorites);
    if (!Array.isArray(parsedFavorites)) {
      return [];
    }

    return parsedFavorites as FavoriteProduct[];
  } catch {
    return [];
  }
}

export function saveFavoriteProducts(favorites: FavoriteProduct[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}
