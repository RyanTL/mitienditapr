import { notFound } from "next/navigation";

import { getShopBySlug } from "@/lib/mock-shop-data";

import CartPageClient from "./CartPageClient";

type CartPageProps = {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<{ vacio?: string }>;
};

export default async function CartPage({ params, searchParams }: CartPageProps) {
  const { shopSlug } = await params;
  const { vacio } = await searchParams;

  const shop = getShopBySlug(shopSlug);

  if (!shop) {
    notFound();
  }

  return <CartPageClient shop={shop} isEmpty={vacio === "1"} />;
}
