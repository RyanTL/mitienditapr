import { FavoritesPageClient } from "@/app/(marketplace)/favoritos/favorites-page-client";
import { fetchFavoriteProductsServer } from "@/lib/supabase/favorites-server";

export default async function FavoritesPage() {
  const initialFavorites = await fetchFavoriteProductsServer();
  return <FavoritesPageClient initialFavorites={initialFavorites} />;
}
