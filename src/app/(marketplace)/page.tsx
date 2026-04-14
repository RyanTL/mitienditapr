import type { ComponentProps } from "react";

import { HomePageClient } from "@/app/(marketplace)/home-page-client";
import { fetchMarketplaceHomeDataServer } from "@/lib/supabase/public-shop-data-server";

export default async function HomePage() {
  let homePageProps: ComponentProps<typeof HomePageClient>;

  try {
    const initialData = await fetchMarketplaceHomeDataServer();
    homePageProps = {
      initialSearchShops: initialData.searchShops,
      initialShopCards: initialData.shopCards,
    };
  } catch (error) {
    homePageProps = {
      initialSearchShops: [],
      initialShopCards: [],
      shopsError:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las tiendas.",
    };
  }

  return <HomePageClient {...homePageProps} />;
}
