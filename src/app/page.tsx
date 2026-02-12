"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FavoriteIcon, HomeIcon, OrdersIcon } from "@/components/icons";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { FloatingSearchButton } from "@/components/navigation/floating-search-button";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { marketplaceShopCards } from "@/lib/mock-shop-data";

export default function HomePage() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#efefef] pb-32">
      <main className="mx-auto w-full max-w-md px-3 py-5">
        <header className="mb-6 flex items-center justify-between">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a4a4a] text-sm font-semibold text-white shadow-sm"
            aria-label="Perfil"
            onClick={() => setIsProfileMenuOpen(true)}
          >
            N
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-[#d6d6d6] bg-white px-3 py-1.5 text-sm font-medium text-[#1a1a1a] shadow-sm">
            <FavoriteIcon />
            Favoritos
          </button>
        </header>

        <section className="space-y-3">
          {marketplaceShopCards.map((shop) => (
            <article
              key={shop.id}
              className="rounded-3xl bg-[#e7e7e7] px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03),0_8px_20px_rgba(0,0,0,0.02)]"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4a4a4a] text-sm font-semibold text-white">
                  N
                </div>
                <div>
                  <h2 className="text-lg leading-tight font-extrabold text-[#131313]">
                    {shop.name}
                  </h2>
                  <p className="text-sm font-semibold text-[#222]">
                    {shop.rating}★ ({shop.reviewCount})
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                {shop.products.map((product) => (
                  <div
                    key={product.id}
                    className="relative h-[120px] overflow-hidden rounded-3xl bg-[#d9d9d9]"
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
                <Link
                  href={`/${shop.id}`}
                  className="text-[2rem] leading-none font-extrabold text-[#141414]"
                >
                  Ver mas
                </Link>
                <Link
                  href={`/${shop.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cfcfcf] bg-[#ececec] text-xl text-[#2a2a2a] shadow-sm"
                  aria-label={`Ver tienda ${shop.name}`}
                >
                  ›
                </Link>
              </div>
            </article>
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
