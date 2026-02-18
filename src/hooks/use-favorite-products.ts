"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createCatalogProductKey } from "@/lib/catalog-ids";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteFavoriteProduct,
  fetchFavoriteProducts,
  upsertFavoriteProduct,
  type FavoriteProduct,
} from "@/lib/supabase/favorites";

type FavoriteProductInput = Omit<FavoriteProduct, "id">;

function createFavoriteProduct(input: FavoriteProductInput): FavoriteProduct {
  return {
    ...input,
    id: createCatalogProductKey(input.shopSlug, input.productId),
  };
}

export function useFavoriteProducts() {
  const router = useRouter();
  const pathname = usePathname();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  const refreshFavorites = useCallback(async () => {
    try {
      const nextFavorites = await fetchFavoriteProducts();
      setFavorites(nextFavorites);
    } catch (error) {
      console.error("No se pudieron cargar favoritos:", error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshFavorites();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshFavorites]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshFavorites();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshFavorites]);

  const redirectToSignIn = useCallback(() => {
    const nextPath = pathname ?? "/";
    router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }, [pathname, router]);

  const addFavorite = useCallback(
    async (input: FavoriteProductInput) => {
      const favorite = createFavoriteProduct(input);
      const previousFavorites = favorites;

      if (previousFavorites.some((item) => item.id === favorite.id)) {
        return true;
      }

      setFavorites((current) => [favorite, ...current]);

      try {
        const result = await upsertFavoriteProduct(input.shopSlug, input.productId);
        if (result.unauthorized) {
          setFavorites(previousFavorites);
          redirectToSignIn();
          return false;
        }

        return true;
      } catch (error) {
        console.error("No se pudo guardar el favorito:", error);
        setFavorites(previousFavorites);
        return false;
      }
    },
    [favorites, redirectToSignIn],
  );

  const removeFavoriteById = useCallback(
    async (favoriteId: string) => {
      const favoriteToRemove = favorites.find((item) => item.id === favoriteId);
      if (!favoriteToRemove) {
        return;
      }

      const previousFavorites = favorites;
      setFavorites((current) => current.filter((item) => item.id !== favoriteId));

      try {
        const result = await deleteFavoriteProduct(
          favoriteToRemove.shopSlug,
          favoriteToRemove.productId,
        );

        if (result.unauthorized) {
          setFavorites(previousFavorites);
          redirectToSignIn();
        }
      } catch (error) {
        console.error("No se pudo eliminar el favorito:", error);
        setFavorites(previousFavorites);
      }
    },
    [favorites, redirectToSignIn],
  );

  const toggleFavorite = useCallback(
    async (input: FavoriteProductInput) => {
      const favorite = createFavoriteProduct(input);
      const favoriteId = favorite.id;
      const previousFavorites = favorites;
      const isCurrentlyFavorite = previousFavorites.some(
        (item) => item.id === favoriteId,
      );

      setFavorites((current) => {
        if (isCurrentlyFavorite) {
          return current.filter((item) => item.id !== favoriteId);
        }
        return [favorite, ...current];
      });

      try {
        const result = isCurrentlyFavorite
          ? await deleteFavoriteProduct(input.shopSlug, input.productId)
          : await upsertFavoriteProduct(input.shopSlug, input.productId);

        if (result.unauthorized) {
          setFavorites(previousFavorites);
          redirectToSignIn();
          return isCurrentlyFavorite;
        }

        return !isCurrentlyFavorite;
      } catch (error) {
        console.error("No se pudo actualizar el favorito:", error);
        setFavorites(previousFavorites);
        return isCurrentlyFavorite;
      }
    },
    [favorites, redirectToSignIn],
  );

  const isFavorite = useCallback(
    (shopSlug: string, productId: string) => {
      const favoriteId = createCatalogProductKey(shopSlug, productId);
      return favorites.some((favorite) => favorite.id === favoriteId);
    },
    [favorites],
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((item) => item.id)),
    [favorites],
  );

  return {
    favorites,
    favoriteIds,
    addFavorite,
    removeFavoriteById,
    toggleFavorite,
    isFavorite,
  };
}
