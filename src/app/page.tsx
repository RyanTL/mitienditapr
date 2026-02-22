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
import { ShopRating } from "@/components/shop/shop-rating";
import { marketplaceShopCards } from "@/lib/mock-shop-data";
import { fetchMarketplaceShopCardsBrowser } from "@/lib/supabase/public-shop-data-browser";

export default function HomePage() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [shopCards, setShopCards] = useState(marketplaceShopCards);

  useEffect(() => {
    let isMounted = true;

    async function loadShops() {
      try {
        const cards = await fetchMarketplaceShopCardsBrowser();
        if (!isMounted) {
          return;
        }
        setShopCards(cards);
      } catch {
        if (!isMounted) {
          return;
        }
        setShopCards(marketplaceShopCards);
      }
    }

    void loadShops();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] pb-32">
      <main className="mx-auto w-full max-w-md px-3 py-5">
        <header className="mb-6 flex items-center justify-between">
          <button type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)] shadow-sm"
            aria-label="Perfil"
            onClick={() => setIsProfileMenuOpen(true)}
          >
            N
          </button>
          <Link href="/favoritos" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-1.5 text-sm font-medium text-[var(--color-carbon)] shadow-sm">
            <FavoriteIcon />
            Favoritos
          </Link>
        </header>

        <section className="space-y-3">
          {shopCards.map((shop) => (
            <Link
              key={shop.id}
              href={`/${shop.id}`}
              className="block rounded-3xl bg-[var(--color-white)] px-4 py-3 shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]"
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
                    className="relative h-[120px] overflow-hidden rounded-3xl bg-[var(--color-gray)]"
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
                <p className="text-[2rem] leading-none font-extrabold text-[var(--color-carbon)]">
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

      <FloatingSearchButton />
      <FloatingCartLink href="/calzado-urbano/carrito" />

      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />
    </div>
  );
}
