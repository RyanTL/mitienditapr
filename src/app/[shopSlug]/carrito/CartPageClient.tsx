"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  checkoutCartByShop,
  fetchCartItems,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
} from "@/lib/supabase/cart";

type CartPageClientProps = {
  shop: ShopDetail;
};

export default function CartPageClient({ shop }: CartPageClientProps) {
  const router = useRouter();
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { addFavorite } = useFavoriteProducts();

  const loadShopCartItems = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const items = await fetchCartItems();
      setCartItems(
        items.filter((item) => item.product.shopSlug === shop.slug),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el carrito.";

      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [shop.slug]);

  useEffect(() => {
    void loadShopCartItems();
  }, [loadShopCartItems]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.product.priceUsd * item.quantity,
        0,
      ),
    [cartItems],
  );

  const activeMenuItem = useMemo(
    () => cartItems.find((item) => item.id === menuItemId) ?? null,
    [cartItems, menuItemId],
  );

  useEffect(() => {
    if (menuItemId && !activeMenuItem) {
      setMenuItemId(null);
    }
  }, [activeMenuItem, menuItemId]);

  const removeLineItem = useCallback(
    async (lineItemId: string) => {
      const previousItems = cartItems;
      setCartItems((current) => current.filter((item) => item.id !== lineItemId));

      try {
        await removeCartItem(lineItemId);
      } catch (error) {
        console.error("No se pudo eliminar el item del carrito:", error);
        setCartItems(previousItems);
      }
    },
    [cartItems],
  );

  const increaseQuantity = useCallback(
    async (lineItemId: string) => {
      const targetItem = cartItems.find((item) => item.id === lineItemId);
      if (!targetItem) {
        return;
      }

      const previousItems = cartItems;
      const nextQuantity = targetItem.quantity + 1;

      setCartItems((current) =>
        current.map((item) =>
          item.id === lineItemId ? { ...item, quantity: nextQuantity } : item,
        ),
      );

      try {
        await setCartItemQuantity(lineItemId, nextQuantity);
      } catch (error) {
        console.error("No se pudo actualizar la cantidad:", error);
        setCartItems(previousItems);
      }
    },
    [cartItems],
  );

  const decreaseQuantity = useCallback(
    async (lineItemId: string) => {
      const targetItem = cartItems.find((item) => item.id === lineItemId);
      if (!targetItem) {
        return;
      }

      const previousItems = cartItems;
      const nextQuantity = targetItem.quantity - 1;

      setCartItems((current) =>
        nextQuantity <= 0
          ? current.filter((item) => item.id !== lineItemId)
          : current.map((item) =>
              item.id === lineItemId ? { ...item, quantity: nextQuantity } : item,
            ),
      );

      try {
        await setCartItemQuantity(lineItemId, nextQuantity);
      } catch (error) {
        console.error("No se pudo actualizar la cantidad:", error);
        setCartItems(previousItems);
      }
    },
    [cartItems],
  );

  const moveActiveItemToFavorites = useCallback(async () => {
    if (!activeMenuItem) {
      setMenuItemId(null);
      return;
    }

    const didSaveFavorite = await addFavorite({
      shopSlug: activeMenuItem.product.shopSlug,
      shopName: activeMenuItem.product.shopName,
      productId: activeMenuItem.product.productId,
      productName: activeMenuItem.product.name,
      priceUsd: activeMenuItem.product.priceUsd,
      imageUrl: activeMenuItem.product.imageUrl,
      alt: activeMenuItem.product.alt,
    });

    if (!didSaveFavorite) {
      return;
    }

    const previousItems = cartItems;
    setCartItems((current) =>
      current.filter((item) => item.id !== activeMenuItem.id),
    );

    try {
      await removeCartItem(activeMenuItem.id);
      setMenuItemId(null);
    } catch (error) {
      console.error("No se pudo mover el item a favoritos:", error);
      setCartItems(previousItems);
      setMenuItemId(null);
    }
  }, [activeMenuItem, addFavorite, cartItems]);

  const handleCheckout = useCallback(async () => {
    setIsCheckingOut(true);

    try {
      const result = await checkoutCartByShop(shop.slug);

      if (result.unauthorized) {
        router.push(`/sign-in?next=${encodeURIComponent(`/${shop.slug}/carrito`)}`);
        return;
      }

      if (result.empty) {
        return;
      }

      await loadShopCartItems();
      router.push("/ordenes");
      router.refresh();
    } catch (error) {
      console.error("No se pudo completar la orden:", error);
    } finally {
      setIsCheckingOut(false);
    }
  }, [loadShopCartItems, router, shop.slug]);

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-6 pb-28 text-[var(--color-carbon)]">
      <main className="mx-auto w-full max-w-md">
        <section className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]">
          <header className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-gray-border)] bg-[var(--color-gray-icon)] text-xl font-bold text-[var(--color-carbon)]">
              N
            </div>
            <div>
              <h1 className="text-base font-bold leading-none text-[var(--color-carbon)]">
                {shop.vendorName}
              </h1>
              <p className="mt-1 text-xs font-medium leading-none text-[var(--color-carbon)]">
                {shop.rating} ★ ({shop.reviewCount})
              </p>
            </div>
          </header>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-8 text-center">
              <p className="text-base font-semibold text-[var(--color-carbon)]">Cargando carrito...</p>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-8 text-center">
              <p className="text-base font-semibold text-[var(--color-carbon)]">
                {loadError}
              </p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-8 text-center">
              <p className="text-base font-semibold text-[var(--color-carbon)]">Tu carrito esta vacio.</p>
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
                        <h2 className="text-sm leading-tight font-medium text-[var(--color-carbon)]">
                          {item.product.name}
                        </h2>
                        <p className="whitespace-nowrap text-sm font-semibold leading-none text-[var(--color-carbon)]">
                          {formatUsd(item.product.priceUsd)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-5 rounded-full border border-[var(--color-gray-border)] bg-[var(--color-white)] px-4 py-2 text-sm leading-none text-[var(--color-carbon)]">
                          <button
                            type="button"
                            aria-label="Reducir cantidad"
                            onClick={() => void decreaseQuantity(item.id)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Aumentar cantidad"
                            onClick={() => void increaseQuantity(item.id)}
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
                <p className="text-lg font-medium leading-none text-[var(--color-carbon)]">Subtotal</p>
                <p className="text-lg font-semibold leading-none text-[var(--color-carbon)]">
                  {formatUsd(subtotal)}
                </p>
              </div>

              <button
                type="button"
                disabled={isCheckingOut}
                className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-base font-semibold text-[var(--color-white)] shadow-[0_10px_24px_var(--shadow-brand-020)] disabled:opacity-70"
                onClick={() => void handleCheckout()}
              >
                {isCheckingOut ? "Procesando..." : "Continuar al pago"}
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
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-lg leading-none text-[var(--color-black)]"
                onClick={() => void moveActiveItemToFavorites()}
              >
                <HeartIcon className="h-8 w-8" />
                Mover a favoritos
              </button>
              <button type="button"
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-lg leading-none text-[var(--color-danger)]"
                onClick={() => {
                  if (activeMenuItem) {
                    void removeLineItem(activeMenuItem.id);
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
