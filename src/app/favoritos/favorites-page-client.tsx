"use client";

import Image from "next/image";
import Link from "next/link";

import { BackIcon, HeartIcon, HomeIcon } from "@/components/icons";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { useFavoriteProducts } from "@/hooks/use-favorite-products";
import { formatUsd } from "@/lib/formatters";

export function FavoritesPageClient() {
  const { favorites, removeFavoriteById } = useFavoriteProducts();

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-5 pb-28 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-4xl">
        <header className="mb-5">
          <h1 className="text-[2rem] leading-none font-extrabold text-[var(--color-carbon)]">
            Favoritos
          </h1>
          <p className="mt-2 text-sm text-[var(--color-carbon)]">
            Productos guardados para comprar despues.
          </p>
        </header>

        {favorites.length === 0 ? (
          <section className="rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-8 text-center">
            <p className="text-lg font-semibold text-[var(--color-carbon)]">
              No tienes productos favoritos.
            </p>
            <p className="mt-1 text-sm text-[var(--color-carbon)]">
              Toca el corazon en cualquier producto para guardarlo aqui.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-full border border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-2 text-sm font-semibold text-[var(--color-carbon)]"
            >
              Explorar tiendas
            </Link>
          </section>
        ) : (
          <section className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {favorites.map((favorite) => (
              <article
                key={favorite.id}
                className="rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3 shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]"
              >
                <div className="flex items-center gap-3">
                  <Link
                    href={`/${favorite.shopSlug}/producto/${favorite.productId}`}
                    className="relative block h-[84px] w-[84px] overflow-hidden rounded-2xl bg-[var(--color-gray)]"
                  >
                    <Image
                      src={favorite.imageUrl}
                      alt={favorite.alt}
                      fill
                      className="object-cover"
                      sizes="84px"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--color-carbon)]">
                      {favorite.shopName}
                    </p>
                    <Link
                      href={`/${favorite.shopSlug}/producto/${favorite.productId}`}
                      className="mt-0.5 block text-lg leading-tight font-bold text-[var(--color-carbon)]"
                    >
                      {favorite.productName}
                    </Link>
                    <p className="mt-1 text-base font-semibold text-[var(--color-carbon)]">
                      {formatUsd(favorite.priceUsd)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-white)]"
                    aria-label={`Quitar ${favorite.productName} de favoritos`}
                    onClick={() => void removeFavoriteById(favorite.id)}
                  >
                    <HeartIcon className="h-5 w-5" />
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <TwoItemBottomNav
        containerClassName={FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS}
        firstItem={{
          ariaLabel: "Volver",
          icon: <BackIcon />,
          href: "/",
        }}
        secondItem={{
          ariaLabel: "Inicio",
          icon: <HomeIcon />,
          href: "/",
        }}
      />
    </div>
  );
}
