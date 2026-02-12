"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  BackIcon,
  CloseIcon,
  HeartIcon,
  HomeIcon,
  TrashIcon,
  DotsIcon,
} from "@/components/icons";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { formatUsd } from "@/lib/formatters";
import type { ShopDetail } from "@/lib/mock-shop-data";

type CartPageClientProps = {
  shop: ShopDetail;
  isEmpty: boolean;
};

export default function CartPageClient({ shop, isEmpty }: CartPageClientProps) {
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

  const cartItems = useMemo(
    () =>
      isEmpty
        ? []
        : [
            {
              id: "line-1",
              product: shop.products[0],
              quantity: 1,
            },
          ],
    [isEmpty, shop.products],
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.priceUsd * item.quantity,
        0,
      ),
    [cartItems],
  );

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-6 pb-28 text-[#141414]">
      <main className="mx-auto w-full max-w-md">
        <section className="rounded-[2rem] border border-[#e2e2e2] bg-white p-5 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
          <header className="mb-6 flex items-center gap-4">
            <div className="flex h-18 w-18 items-center justify-center rounded-full border border-[#dddddd] bg-[#f4f4f4] text-4xl font-bold text-[#4f4f4f]">
              N
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-none text-[#171717]">
                {shop.vendorName}
              </h1>
              <p className="mt-1 text-lg font-semibold leading-none text-[#2b2b2b]">
                4.9 ★ (606)
              </p>
            </div>
          </header>

          {cartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d0d0d0] bg-[#f8f8f8] px-4 py-8 text-center">
              <p className="text-2xl font-semibold text-[#222]">Tu carrito esta vacio.</p>
              <p className="mt-2 text-sm text-[#666]">
                Agrega productos para continuar con tu compra.
              </p>
              <Link
                href={`/${shop.slug}`}
                className="mt-5 inline-flex rounded-full bg-[#f0f0f0] px-4 py-2 text-sm font-semibold text-[#222]"
              >
                Volver a la tienda
              </Link>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <article key={item.id} className="mb-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="relative h-[94px] w-[94px] overflow-hidden rounded-2xl bg-[#f0f0f0]">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.alt}
                        fill
                        className="object-cover"
                        sizes="94px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-xl leading-tight font-medium text-[#1b1b1b]">
                          {item.product.name}
                        </h2>
                        <p className="whitespace-nowrap text-lg font-semibold leading-none text-[#1b1b1b]">
                          {formatUsd(item.product.priceUsd)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-5 rounded-full border border-[#d9d9d9] bg-white px-4 py-2 text-lg leading-none text-[#1f1f1f]">
                          <button type="button" aria-label="Eliminar producto">
                            <TrashIcon />
                          </button>
                          <span>{item.quantity}</span>
                          <button type="button" aria-label="Agregar uno mas">+</button>
                        </div>

                        <button type="button"
                          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d9d9d9] text-[#2a2a2a]"
                          aria-label="Opciones del producto"
                          onClick={() => setMenuItemId(item.id)}
                        >
                          <DotsIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <div className="mb-5 flex items-center justify-between">
                <p className="text-xl font-medium leading-none text-[#171717]">Subtotal</p>
                <p className="text-xl font-semibold leading-none text-[#171717]">
                  {formatUsd(subtotal)}
                </p>
              </div>

              <button type="button" className="w-full rounded-3xl bg-[green] px-6 py-3.5 text-xl font-semibold text-white shadow-[0_10px_24px_rgba(34,197,94,0.2)]">
                Continuar al pago
              </button>
            </>
          )}
        </section>
      </main>

      <TwoItemBottomNav
        containerClassName={FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS}
        firstItem={{
          ariaLabel: "Volver a la tienda",
          icon: <BackIcon />,
          href: `/${shop.slug}`,
        }}
        secondItem={{
          ariaLabel: "Ir a inicio",
          icon: <HomeIcon />,
          href: "/",
        }}
      />

      {menuItemId ? (
        <div className="fixed inset-0 z-40">
          <button type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Cerrar menu del producto"
            onClick={() => setMenuItemId(null)}
          />

          <section className="absolute inset-x-4 top-1/2 mx-auto max-w-3xl -translate-y-1/2 rounded-[2.25rem] bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-7 flex items-start justify-between">
              <h3 className="text-3xl font-bold leading-none text-black">
                Administrar producto
              </h3>
              <button type="button"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ececec] text-[#6a6a6a]"
                aria-label="Cerrar menu"
                onClick={() => setMenuItemId(null)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-3">
              <button type="button"
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-2xl leading-none text-black"
                onClick={() => setMenuItemId(null)}
              >
                <HeartIcon className="h-8 w-8" />
                Mover a guardados
              </button>
              <button type="button"
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-2xl leading-none text-[#d92f11]"
                onClick={() => setMenuItemId(null)}
              >
                <span className="text-[#d92f11]">
                  <TrashIcon />
                </span>
                Eliminar del carrito
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
