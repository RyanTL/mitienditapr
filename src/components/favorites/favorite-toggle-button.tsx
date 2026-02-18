"use client";

import { HeartIcon } from "@/components/icons";
import { useFavoriteProducts } from "@/hooks/use-favorite-products";

type FavoriteToggleButtonProps = {
  product: {
    shopSlug: string;
    shopName: string;
    productId: string;
    productName: string;
    priceUsd: number;
    imageUrl: string;
    alt: string;
  };
  baseClassName: string;
  activeClassName: string;
  inactiveClassName: string;
  iconClassName?: string;
  activeIconClassName?: string;
  inactiveIconClassName?: string;
  preventLinkNavigation?: boolean;
  ariaLabelAdd?: string;
  ariaLabelRemove?: string;
};

export function FavoriteToggleButton({
  product,
  baseClassName,
  activeClassName,
  inactiveClassName,
  iconClassName,
  activeIconClassName = "",
  inactiveIconClassName = "",
  preventLinkNavigation = false,
  ariaLabelAdd = "Guardar producto",
  ariaLabelRemove = "Quitar de favoritos",
}: FavoriteToggleButtonProps) {
  const { favoriteIds, toggleFavorite } = useFavoriteProducts();
  const favoriteId = `${product.shopSlug}:${product.productId}`;
  const isFavorite = favoriteIds.has(favoriteId);

  return (
    <button
      type="button"
      className={`${baseClassName} ${isFavorite ? activeClassName : inactiveClassName}`}
      aria-label={isFavorite ? ariaLabelRemove : ariaLabelAdd}
      onClick={(event) => {
        if (preventLinkNavigation) {
          event.preventDefault();
          event.stopPropagation();
        }

        void toggleFavorite(product);
      }}
    >
      <HeartIcon
        filled={isFavorite}
        className={`${iconClassName ?? ""} ${isFavorite ? activeIconClassName : inactiveIconClassName}`}
      />
    </button>
  );
}
