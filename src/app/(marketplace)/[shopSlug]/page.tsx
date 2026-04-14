import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopPageClient } from "@/app/(marketplace)/[shopSlug]/shop-page-client";
import { fetchShopDetailBySlugServer } from "@/lib/supabase/public-shop-data-server";

type ShopPageProps = {
  params: Promise<{ shopSlug: string }>;
};

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { shopSlug } = await params;
  const shop = await fetchShopDetailBySlugServer(shopSlug);

  if (!shop) {
    return { title: "Tienda no encontrada — Mitiendita PR" };
  }

  return {
    title: `${shop.vendorName} — Mitiendita PR`,
    description: shop.description || `Compra en ${shop.vendorName} en Mitiendita PR.`,
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { shopSlug } = await params;
  const shop = await fetchShopDetailBySlugServer(shopSlug);

  if (!shop) {
    notFound();
  }

  return <ShopPageClient shop={shop} />;
}
