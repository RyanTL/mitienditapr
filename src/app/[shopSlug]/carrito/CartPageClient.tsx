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
import { useFavoriteProducts } from "@/hooks/use-favorite-products";
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
  const { addFavorite } = useFavoriteProducts();
  const [cartItems, setCartItems] = useState(() =>
    isEmpty
      ? []
      : [
          {
            id: "line-1",
            product: shop.products[0],
            quantity: 1,
          },
        ],
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.priceUsd * item.quantity,
        0,
      ),
    [cartItems],
  );
  const activeMenuItem = useMemo(
    () => cartItems.find((item) => item.id === menuItemId),
    [cartItems, menuItemId],
  );
  const removeLineItem = (lineItemId: string) => {
    setCartItems((current) => current.filter((item) => item.id !== lineItemId));
  };

  const increaseQuantity = (lineItemId: string) => {
    setCartItems((current) =>
      current.map((item) =>
        item.id === lineItemId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decreaseQuantity = (lineItemId: string) => {
    setCartItems((current) =>
      current.flatMap((item) => {
        if (item.id !== lineItemId) {
          return [item];
        }

        const nextQuantity = item.quantity - 1;
        if (nextQuantity <= 0) {
          return [];
        }

        return [{ ...item, quantity: nextQuantity }];
      }),
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-6 pb-28 text-[var(--color-carbon)]">
      <main className="mx-auto w-full max-w-md">
        <section className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]">
          <header className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-gray-border)] bg-[var(--color-gray-icon)] text-xl font-bold text-[var(--color-carbon)]">
              N
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-[var(--color-carbon)]">
                {shop.vendorName}
              </h1>
              <p className="mt-1 text-sm font-medium leading-none text-[var(--color-carbon)]">
                {shop.rating} ★ ({shop.reviewCount})
              </p>
            </div>
          </header>

          {cartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-8 text-center">
              <p className="text-2xl font-semibold text-[var(--color-carbon)]">Tu carrito esta vacio.</p>
              <p className="mt-2 text-sm text-[var(--color-carbon)]">
                Agrega productos para continuar con tu compra.
              </p>
              <Link
                href={`/${shop.slug}`}
                className="mt-5 inline-flex rounded-full bg-[var(--color-gray)] px-4 py-2 text-sm font-semibold text-[var(--color-carbon)]"
              >
                Volver a la tienda
              </Link>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <article key={item.id} className="mb-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="relative h-[94px] w-[94px] overflow-hidden rounded-2xl bg-[var(--color-gray)]">
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
                        <h2 className="text-xl leading-tight font-medium text-[var(--color-carbon)]">
                          {item.product.name}
                        </h2>
                        <p className="whitespace-nowrap text-lg font-semibold leading-none text-[var(--color-carbon)]">
                          {formatUsd(item.product.priceUsd)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-5 rounded-full border border-[var(--color-gray-border)] bg-[var(--color-white)] px-4 py-2 text-lg leading-none text-[var(--color-carbon)]">
                          <button
                            type="button"
                            aria-label="Reducir cantidad"
                            onClick={() => decreaseQuantity(item.id)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Aumentar cantidad"
                            onClick={() => increaseQuantity(item.id)}
                          >
                            +
                          </button>
                        </div>

                        <button type="button"
                          className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
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
                <p className="text-xl font-medium leading-none text-[var(--color-carbon)]">Subtotal</p>
                <p className="text-xl font-semibold leading-none text-[var(--color-carbon)]">
                  {formatUsd(subtotal)}
                </p>
              </div>

              <button type="button" className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-xl font-semibold text-[var(--color-white)] shadow-[0_10px_24px_var(--shadow-brand-020)]">
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
            className="absolute inset-0 bg-[var(--overlay-black-055)]"
            aria-label="Cerrar menu del producto"
            onClick={() => setMenuItemId(null)}
          />

          <section className="absolute inset-x-4 top-1/2 mx-auto max-w-3xl -translate-y-1/2 rounded-[2.25rem] bg-[var(--color-white)] p-8 shadow-[0_30px_80px_var(--shadow-black-035)]">
            <div className="mb-7 flex items-start justify-between">
              <h3 className="text-3xl font-bold leading-none text-[var(--color-black)]">
                Administrar producto
              </h3>
              <button type="button"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-gray-icon)] text-[var(--color-carbon)]"
                aria-label="Cerrar menu"
                onClick={() => setMenuItemId(null)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-3">
              <button type="button"
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-2xl leading-none text-[var(--color-black)]"
                onClick={() => {
                  if (!activeMenuItem) {
                    setMenuItemId(null);
                    return;
                  }

                  addFavorite({
                    shopSlug: shop.slug,
                    shopName: shop.vendorName,
                    productId: activeMenuItem.product.id,
                    productName: activeMenuItem.product.name,
                    priceUsd: activeMenuItem.product.priceUsd,
                    imageUrl: activeMenuItem.product.imageUrl,
                    alt: activeMenuItem.product.alt,
                  });
                  removeLineItem(activeMenuItem.id);
                  setMenuItemId(null);
                }}
              >
                <HeartIcon className="h-8 w-8" />
                Mover a favoritos
              </button>
              <button type="button"
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-2xl leading-none text-[var(--color-danger)]"
                onClick={() => {
                  if (activeMenuItem) {
                    removeLineItem(activeMenuItem.id);
                  }
                  setMenuItemId(null);
                }}
              >
                <span className="text-[var(--color-danger)]">
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
