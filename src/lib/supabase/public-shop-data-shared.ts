import type { MarketplaceShopCard, ShopDetail } from "@/lib/mock-shop-data";

const FALLBACK_IMAGE_URL =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=80";

export type ShopRow = {
  id: string;
  slug: string;
  vendor_name: string;
  rating: number;
  review_count: number;
  description: string;
  is_active: boolean;
};

export type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price_usd: number;
  image_url: string | null;
  is_active: boolean;
};

export function formatRating(rating: number | null | undefined) {
  return Number(rating ?? 0).toFixed(1);
}

export function mapProductRowToDetailProduct(product: ProductRow) {
  return {
    id: product.id,
    name: product.name,
    priceUsd: Number(product.price_usd ?? 0),
    imageUrl: product.image_url || FALLBACK_IMAGE_URL,
    alt: product.name,
    description: product.description ?? "",
  };
}

export function buildShopDetail(shop: ShopRow, products: ProductRow[]): ShopDetail {
  const shopProducts = products
    .filter((product) => product.shop_id === shop.id)
    .map(mapProductRowToDetailProduct);

  return {
    slug: shop.slug,
    vendorName: shop.vendor_name,
    rating: formatRating(shop.rating),
    reviewCount: Number(shop.review_count ?? 0),
    description: shop.description ?? "",
    products: shopProducts,
  };
}

export function buildShopCard(shop: ShopRow, products: ProductRow[]): MarketplaceShopCard {
  const previewProducts = products
    .filter((product) => product.shop_id === shop.id)
    .slice(0, 3)
    .map((product) => ({
      id: product.id,
      imageUrl: product.image_url || FALLBACK_IMAGE_URL,
      alt: product.name,
    }));

  while (previewProducts.length < 3) {
    previewProducts.push({
      id: `${shop.slug}-placeholder-${previewProducts.length + 1}`,
      imageUrl: FALLBACK_IMAGE_URL,
      alt: shop.vendor_name,
    });
  }

  return {
    id: shop.slug,
    name: shop.vendor_name,
    rating: formatRating(shop.rating),
    reviewCount: Number(shop.review_count ?? 0),
    products: previewProducts,
  };
}
