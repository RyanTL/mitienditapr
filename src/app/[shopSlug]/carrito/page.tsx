import { notFound } from "next/navigation";

import { getShopBySlug } from "@/lib/mock-shop-data";

import CartPageClient from "./CartPageClient";

type CartPageProps = {
  params: Promise<{ shopSlug: string }>;
};

export default async function CartPage({ params }: CartPageProps) {
  const { shopSlug } = await params;
  const shop = getShopBySlug(shopSlug);

  if (!shop) {
    notFound();
  }

  return <CartPageClient shop={shop} />;
}
