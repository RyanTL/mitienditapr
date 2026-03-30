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
};

export type MarketplaceShopCard = {
  id: string;
  name: string;
  rating: string;
  reviewCount: number;
  products: Pick<Product, "id" | "imageUrl" | "alt">[];
};
