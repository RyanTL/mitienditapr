import { notFound } from "next/navigation";

import { ShopPageClient } from "@/app/[shopSlug]/shop-page-client";
import { fetchShopDetailBySlugServer } from "@/lib/supabase/public-shop-data";

type ShopPageProps = {
  params: Promise<{ shopSlug: string }>;
};

export default async function ShopPage({ params }: ShopPageProps) {
  const { shopSlug } = await params;
  const shop = await fetchShopDetailBySlugServer(shopSlug);

  if (!shop) {
    notFound();
  }

  return <ShopPageClient shop={shop} />;
}
