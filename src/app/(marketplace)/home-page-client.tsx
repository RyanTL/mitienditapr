"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ChevronIcon,
  FavoriteIcon,
  HomeIcon,
  OrdersIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { FloatingSearchButton } from "@/components/navigation/floating-search-button";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { ShopRating } from "@/components/shop/shop-rating";
import { useAuthUser, getUserInitial } from "@/hooks/use-auth-user";
import {
  filterMarketplaceShopsByQuery,
  normalizeMarketplaceSearchText,
} from "@/lib/marketplace/search";
import type { MarketplaceSearchShop } from "@/lib/supabase/public-shop-data-shared";
import type { MarketplaceShopCard } from "@/lib/supabase/shop-types";

const ProfileMenu = dynamic(
  () =>
    import("@/components/profile/profile-menu").then((mod) => mod.ProfileMenu),
  { ssr: false },
);

const HomeSearchOverlay = dynamic(
  () =>
    import("@/components/search/home-search-overlay").then(
      (mod) => mod.HomeSearchOverlay,
    ),
  { ssr: false },
);

type HomePageClientProps = {
  initialSearchShops: MarketplaceSearchShop[];
  initialShopCards: MarketplaceShopCard[];
  shopsError?: string | null;
};

export function HomePageClient({
  initialSearchShops,
  initialShopCards,
  shopsError = null,
}: HomePageClientProps) {
  const { user } = useAuthUser();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const normalizedFilterQuery = useMemo(
    () => normalizeMarketplaceSearchText(filterQuery),
    [filterQuery],
  );

  const filteredShopCards = useMemo(() => {
    if (!normalizedFilterQuery) {
      return initialShopCards;
    }

    const matchingSlugs = new Set(
      filterMarketplaceShopsByQuery(initialSearchShops, normalizedFilterQuery).map(
        (shop) => shop.slug,
      ),
    );

    return initialShopCards.filter((card) => matchingSlugs.has(card.id));
  }, [initialSearchShops, initialShopCards, normalizedFilterQuery]);

  const isFiltering = normalizedFilterQuery.length > 0;
  const hasNoFilterResults =
    isFiltering && filteredShopCards.length === 0 && !shopsError;

  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 lg:pb-8">
      <main className="mx-auto w-full px-4 py-5 md:px-8 lg:max-w-5xl lg:px-8">
        <header className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)] shadow-sm lg:hidden"
            aria-label="Perfil"
            onClick={() => setIsProfileMenuOpen(true)}
          >
            {user ? getUserInitial(user) : <UserIcon className="h-4 w-4" />}
          </button>

          {user ? (
            <Link
              href="/favoritos"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-1.5 text-sm font-medium text-[var(--color-carbon)] shadow-sm lg:hidden"
            >
              <FavoriteIcon />
              Favoritos
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)] bg-[var(--color-brand)] px-3 py-1.5 text-sm font-semibold text-[var(--color-white)] shadow-sm lg:hidden"
            >
              Iniciar sesión
            </Link>
          )}

          <h1 className="hidden text-2xl font-extrabold tracking-tight text-[var(--color-carbon)] lg:block">
            Tiendas
          </h1>

          <label className="relative hidden lg:block">
            <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-[var(--color-gray-500)]">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              placeholder="Buscar tiendas o productos"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              className="w-64 rounded-full border border-[var(--color-gray-200)] bg-[var(--color-white)] py-2 pr-4 pl-9 text-sm text-[var(--color-carbon)] shadow-sm outline-none transition-[width] duration-200 focus:w-80 focus:border-[var(--color-brand)]"
            />
          </label>
        </header>

        <div className="mb-4 lg:hidden">
          <label className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-[var(--color-gray-500)]">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              placeholder="Buscar tiendas o productos"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] py-2.5 pr-4 pl-9 text-sm text-[var(--color-carbon)] shadow-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        </div>

        {shopsError ? (
          <section className="rounded-3xl bg-[var(--color-white)] px-4 py-5 text-center shadow-[0_1px_3px_var(--shadow-black-008),0_8px_24px_var(--shadow-black-008)]">
            <p className="text-sm font-semibold text-[var(--color-danger)]">
              No se pudieron cargar las tiendas.
            </p>
            <p className="mt-1 text-xs text-[var(--color-gray-500)]">
              {shopsError}
            </p>
          </section>
        ) : null}

        {!shopsError && initialShopCards.length === 0 && !isFiltering ? (
          <section className="rounded-3xl bg-[var(--color-white)] px-4 py-5 text-center shadow-[0_1px_3px_var(--shadow-black-008),0_8px_24px_var(--shadow-black-008)]">
            <p className="text-sm font-semibold text-[var(--color-carbon)]">
              No hay tiendas disponibles.
            </p>
          </section>
        ) : null}

        {hasNoFilterResults ? (
          <section className="rounded-3xl bg-[var(--color-white)] px-4 py-5 text-center shadow-[0_1px_3px_var(--shadow-black-008),0_8px_24px_var(--shadow-black-008)]">
            <p className="text-sm font-semibold text-[var(--color-carbon)]">
              No encontramos resultados para &ldquo;{filterQuery}&rdquo;.
            </p>
            <p className="mt-1 text-xs text-[var(--color-gray-500)]">
              Intenta con otro término.
            </p>
          </section>
        ) : null}

        {!shopsError && filteredShopCards.length > 0 ? (
          <section className="space-y-3 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 lg:gap-6">
            {filteredShopCards.map((shop) => (
              <Link
                key={shop.id}
                href={`/${shop.id}`}
                className="block rounded-3xl bg-[var(--color-white)] px-4 py-4 shadow-[0_1px_3px_var(--shadow-black-008),0_8px_24px_var(--shadow-black-008)] transition-shadow hover:shadow-[0_14px_30px_var(--shadow-black-012)] md:px-5 md:py-5"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)]">
                    {shop.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold leading-tight text-[var(--color-carbon)] lg:text-lg">
                      {shop.name}
                    </h2>
                    <ShopRating
                      rating={shop.rating}
                      reviewCount={shop.reviewCount}
                    />
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2 lg:hidden">
                  {shop.products.map((product) => (
                    <div
                      key={product.id}
                      className="relative h-[120px] overflow-hidden rounded-2xl bg-[var(--color-gray)] md:h-[130px]"
                    >
                      <Image
                        src={product.imageUrl}
                        alt={product.alt}
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-4 hidden lg:grid lg:h-[220px] lg:grid-cols-5 lg:grid-rows-2 lg:gap-2">
                  <div className="relative col-span-3 row-span-2 overflow-hidden rounded-2xl bg-[var(--color-gray)]">
                    <Image
                      src={shop.products[0].imageUrl}
                      alt={shop.products[0].alt}
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  </div>
                  <div className="relative col-span-2 overflow-hidden rounded-2xl bg-[var(--color-gray)]">
                    <Image
                      src={shop.products[1].imageUrl}
                      alt={shop.products[1].alt}
                      fill
                      className="object-cover"
                      sizes="170px"
                    />
                  </div>
                  <div className="relative col-span-2 overflow-hidden rounded-2xl bg-[var(--color-gray)]">
                    <Image
                      src={shop.products[2].imageUrl}
                      alt={shop.products[2].alt}
                      fill
                      className="object-cover"
                      sizes="170px"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[1.75rem] leading-none font-extrabold text-[var(--color-carbon)] md:text-[2rem]">
                    Ver más
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray-200)] bg-[var(--color-gray-100)] text-[var(--color-carbon)]">
                    <ChevronIcon className="h-5 w-5" />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}
      </main>

      <TwoItemBottomNav
        containerClassName={FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS}
        firstItem={{
          ariaLabel: "Inicio",
          icon: <HomeIcon />,
          href: "/",
          isActive: true,
        }}
        secondItem={
          user
            ? { ariaLabel: "Órdenes", icon: <OrdersIcon />, href: "/ordenes" }
            : {
                ariaLabel: "Iniciar sesión",
                icon: <UserIcon />,
                href: "/sign-in",
              }
        }
      />

      <FloatingSearchButton onClick={() => setIsSearchOpen(true)} hasCart={!!user} />
      {user ? <FloatingCartLink href="/carrito" resolveFromCart /> : null}

      {isProfileMenuOpen ? (
        <ProfileMenu
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
        />
      ) : null}

      {isSearchOpen ? (
        <HomeSearchOverlay
          isOpen={isSearchOpen}
          shops={initialSearchShops}
          onClose={() => setIsSearchOpen(false)}
        />
      ) : null}
    </div>
  );
}
