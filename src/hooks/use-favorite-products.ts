"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FAVORITES_CHANGED_EVENT,
  buildFavoriteProductId,
  createFavoriteProduct,
  getFavoriteProducts,
  saveFavoriteProducts,
  type FavoriteProduct,
} from "@/lib/favorites-storage";

type FavoriteProductInput = Omit<FavoriteProduct, "id">;

function getInitialFavorites() {
  if (typeof window === "undefined") {
    return [] as FavoriteProduct[];
  }

  return getFavoriteProducts();
}

export function useFavoriteProducts() {
  const [favorites, setFavorites] =
    useState<FavoriteProduct[]>(getInitialFavorites);

  useEffect(() => {
    const syncFavorites = () => {
      setFavorites(getFavoriteProducts());
    };

    window.addEventListener("storage", syncFavorites);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);

    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    };
  }, []);

  const updateFavorites = useCallback(
    (updater: (current: FavoriteProduct[]) => FavoriteProduct[]) => {
      const nextFavorites = updater(getFavoriteProducts());
      saveFavoriteProducts(nextFavorites);
      setFavorites(nextFavorites);
      window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
    },
    [],
  );

  const addFavorite = useCallback(
    (input: FavoriteProductInput) => {
      const favorite = createFavoriteProduct(input);
      updateFavorites((current) => {
        if (current.some((item) => item.id === favorite.id)) {
          return current;
        }
        return [favorite, ...current];
      });
    },
    [updateFavorites],
  );

  const removeFavoriteById = useCallback(
    (favoriteId: string) => {
      updateFavorites((current) =>
        current.filter((item) => item.id !== favoriteId),
      );
    },
    [updateFavorites],
  );

  const toggleFavorite = useCallback(
    (input: FavoriteProductInput) => {
      const favorite = createFavoriteProduct(input);
      const favoriteId = favorite.id;
      let willBeFavorite = false;

      updateFavorites((current) => {
        const alreadyFavorite = current.some((item) => item.id === favoriteId);
        willBeFavorite = !alreadyFavorite;
        if (alreadyFavorite) {
          return current.filter((item) => item.id !== favoriteId);
        }
        return [favorite, ...current];
      });

      return willBeFavorite;
    },
    [updateFavorites],
  );

  const isFavorite = useCallback(
    (shopSlug: string, productId: string) => {
      const favoriteId = buildFavoriteProductId(shopSlug, productId);
      return favorites.some((item) => item.id === favoriteId);
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
