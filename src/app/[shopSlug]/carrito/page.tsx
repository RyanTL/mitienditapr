import { notFound } from "next/navigation";

import { fetchShopDetailBySlugServer } from "@/lib/supabase/public-shop-data";

import CartPageClient from "./CartPageClient";

type CartPageProps = {
  params: Promise<{ shopSlug: string }>;
};

export default async function CartPage({ params }: CartPageProps) {
  const { shopSlug } = await params;
  const shop = await fetchShopDetailBySlugServer(shopSlug);

  if (!shop) {
    notFound();
  }

  return <CartPageClient shop={shop} />;
}
