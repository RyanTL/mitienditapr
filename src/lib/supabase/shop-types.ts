export type Product = {
  id: string;
  name: string;
  priceUsd: number;
  rating?: string;
  reviewCount?: number;
  imageUrl: string;
  alt: string;
  description: string;
};

export type ShopDetail = {
  slug: string;
  vendorName: string;
  rating: string;
  reviewCount: number;
  description: string;
  products: Product[];
  athMovilPhone: string | null;
  shippingFlatFeeUsd: number;
  offersPickup: boolean;
  acceptsStripePayments: boolean;
};

export type MarketplaceShopCard = {
  id: string;
  name: string;
  rating: string;
  reviewCount: number;
  products: Pick<
    Product,
    "id" | "name" | "priceUsd" | "rating" | "reviewCount" | "imageUrl" | "alt"
  >[];
};
