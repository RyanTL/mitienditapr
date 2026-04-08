import type { MarketplaceShopCard, ShopDetail } from "@/lib/supabase/shop-types";

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
  shipping_flat_fee_usd: number;
  offers_pickup: boolean;
  stripe_connect_account_id: string | null;
  ath_movil_phone: string | null;
};

export type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price_usd: number;
  rating: number;
  review_count: number;
  image_url: string | null;
  is_active: boolean;
};

export type MarketplaceSearchProduct = {
  id: string;
  name: string;
  priceUsd: number;
  rating?: string;
  reviewCount?: number;
  imageUrl: string;
  alt: string;
};

export type MarketplaceSearchShop = {
  id: string;
  slug: string;
  name: string;
  rating: string;
  reviewCount: number;
  products: MarketplaceSearchProduct[];
};

export function formatRating(rating: number | null | undefined) {
  return Number(rating ?? 0).toFixed(1);
}

function getProductImageUrl(imageUrl: string | null | undefined) {
  return imageUrl || FALLBACK_IMAGE_URL;
}

function groupProductsByShopId(products: ProductRow[]) {
  const productsByShopId = new Map<string, ProductRow[]>();

  products.forEach((product) => {
    const currentProducts = productsByShopId.get(product.shop_id) ?? [];
    currentProducts.push(product);
    productsByShopId.set(product.shop_id, currentProducts);
  });

  return productsByShopId;
}

export function mapProductRowToDetailProduct(product: ProductRow) {
  return {
    id: product.id,
    name: product.name,
    priceUsd: Number(product.price_usd ?? 0),
    rating: formatRating(product.rating),
    reviewCount: Number(product.review_count ?? 0),
    imageUrl: getProductImageUrl(product.image_url),
    alt: product.name,
    description: product.description ?? "",
  };
}

export function buildMarketplaceSearchShop(
  shop: ShopRow,
  products: ProductRow[],
): MarketplaceSearchShop {
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.vendor_name,
    rating: formatRating(shop.rating),
    reviewCount: Number(shop.review_count ?? 0),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      priceUsd: Number(product.price_usd ?? 0),
      rating: formatRating(product.rating),
      reviewCount: Number(product.review_count ?? 0),
      imageUrl: getProductImageUrl(product.image_url),
      alt: product.name,
    })),
  };
}

export function buildMarketplaceSearchShops(
  shops: ShopRow[],
  products: ProductRow[],
): MarketplaceSearchShop[] {
  const productsByShopId = groupProductsByShopId(products);

  return shops.map((shop) =>
    buildMarketplaceSearchShop(shop, productsByShopId.get(shop.id) ?? []),
  );
}

export function buildShopDetail(shop: ShopRow, products: ProductRow[]): ShopDetail {
  const shopProducts = products.map(mapProductRowToDetailProduct);

  return {
    slug: shop.slug,
    vendorName: shop.vendor_name,
    rating: formatRating(shop.rating),
    reviewCount: Number(shop.review_count ?? 0),
    description: shop.description ?? "",
    products: shopProducts,
    athMovilPhone: shop.ath_movil_phone ?? null,
    shippingFlatFeeUsd: Number(shop.shipping_flat_fee_usd ?? 0),
    offersPickup: Boolean(shop.offers_pickup),
    acceptsStripePayments: Boolean(shop.stripe_connect_account_id),
  };
}

export function buildMarketplaceShopCards(
  searchShops: MarketplaceSearchShop[],
): MarketplaceShopCard[] {
  return searchShops.map((shop) => {
    const previewProducts = shop.products.slice(0, 3).map((product) => ({
      id: product.id,
      name: product.name,
      priceUsd: product.priceUsd,
      rating: product.rating,
      reviewCount: product.reviewCount,
      imageUrl: getProductImageUrl(product.imageUrl),
      alt: product.alt,
    }));

    return {
      id: shop.slug,
      name: shop.name,
      rating: shop.rating,
      reviewCount: shop.reviewCount,
      products: previewProducts,
    };
  });
}
