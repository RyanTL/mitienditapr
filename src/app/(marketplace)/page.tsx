"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronIcon, FavoriteIcon, HomeIcon, OrdersIcon } from "@/components/icons";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { FloatingSearchButton } from "@/components/navigation/floating-search-button";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { HomeSearchOverlay } from "@/components/search/home-search-overlay";
import { ShopRating } from "@/components/shop/shop-rating";
import {
  fetchMarketplaceSearchShopsBrowser,
  mapSearchShopsToCards,
  type MarketplaceSearchShop,
} from "@/lib/supabase/public-shop-data-browser";

export default function HomePage() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [shopCards, setShopCards] = useState<ReturnType<typeof mapSearchShopsToCards>>(
    [],
  );
  const [searchShops, setSearchShops] = useState<MarketplaceSearchShop[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [shopsError, setShopsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadShops() {
      setIsLoadingShops(true);
      setShopsError(null);

      try {
        const shops = await fetchMarketplaceSearchShopsBrowser();
        if (!isMounted) {
          return;
        }
        setSearchShops(shops);
        setShopCards(mapSearchShopsToCards(shops));
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSearchShops([]);
        setShopCards([]);
        setShopsError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las tiendas.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingShops(false);
        }
      }
    }

    void loadShops();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] pb-32 lg:pb-8">
      <main className="mx-auto w-full max-w-md px-3 py-5 md:max-w-3xl md:px-5 lg:max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          {/* Mobile-only profile + favorites */}
          <button type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)] shadow-sm lg:hidden"
            aria-label="Perfil"
            onClick={() => setIsProfileMenuOpen(true)}
          >
            N
          </button>
          <Link href="/favoritos" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-1.5 text-sm font-medium text-[var(--color-carbon)] shadow-sm lg:hidden">
            <FavoriteIcon />
            Favoritos
          </Link>
          {/* Desktop-only page heading */}
          <h1 className="hidden text-2xl font-extrabold tracking-tight text-[var(--color-carbon)] lg:block">
            Tiendas
          </h1>
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full border border-[var(--color-gray-200)] bg-[var(--color-white)] px-4 py-2 text-sm font-medium text-[var(--color-gray-500)] shadow-sm transition-colors hover:bg-[var(--color-gray-100)] lg:inline-flex"
            onClick={() => setIsSearchOpen(true)}
          >
            Buscar tiendas...
          </button>
        </header>

        {shopsError ? (
          <section className="rounded-3xl bg-[var(--color-white)] px-4 py-5 text-center shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]">
            <p className="text-sm font-semibold text-[var(--color-danger)]">
              No se pudieron cargar las tiendas.
            </p>
            <p className="mt-1 text-xs text-[var(--color-gray-500)]">{shopsError}</p>
          </section>
        ) : null}

        {isLoadingShops && !shopsError ? (
          <section className="rounded-3xl bg-[var(--color-white)] px-4 py-5 text-center shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]">
            <p className="text-sm text-[var(--color-gray-500)]">Cargando tiendas...</p>
          </section>
        ) : null}

        {!isLoadingShops && !shopsError && shopCards.length === 0 ? (
          <section className="rounded-3xl bg-[var(--color-white)] px-4 py-5 text-center shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]">
            <p className="text-sm font-semibold text-[var(--color-carbon)]">
              No hay tiendas disponibles.
            </p>
          </section>
        ) : null}

        {!isLoadingShops && !shopsError && shopCards.length > 0 ? (
          <section className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
            {shopCards.map((shop) => (
              <Link
                key={shop.id}
                href={`/${shop.id}`}
                className="block rounded-3xl bg-[var(--color-white)] px-4 py-3 shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)] md:px-5 md:py-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)]">
                    N
                  </div>
                  <div>
                    <h2 className="text-lg leading-tight font-extrabold text-[var(--color-carbon)]">
                      {shop.name}
                    </h2>
                    <ShopRating rating={shop.rating} reviewCount={shop.reviewCount} />
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  {shop.products.map((product) => (
                    <div
                      key={product.id}
                      className="relative h-[120px] overflow-hidden rounded-3xl bg-[var(--color-gray)] md:h-[128px] lg:h-[140px]"
                    >
                      <Image
                        src={product.imageUrl}
                        alt={product.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 220px"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[2rem] leading-none font-extrabold text-[var(--color-carbon)] md:text-[2.15rem]">
                    Ver mas
                  </p>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray-300)] bg-[var(--color-gray-icon)] text-xl text-[var(--color-carbon)]"
                  >
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
        secondItem={{
          ariaLabel: "Ordenes",
          icon: <OrdersIcon />,
          href: "/ordenes",
        }}
      />

      <FloatingSearchButton onClick={() => setIsSearchOpen(true)} />
      <FloatingCartLink href="/carrito" resolveFromCart />

      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />

      <HomeSearchOverlay
        isOpen={isSearchOpen}
        shops={searchShops}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
