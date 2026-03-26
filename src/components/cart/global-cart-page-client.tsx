"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BackHomeBottomNav } from "@/components/navigation/back-home-bottom-nav";
import { AthMovilCheckoutSheet } from "@/components/cart/ath-movil-checkout-sheet";
import { formatUsd } from "@/lib/formatters";
import {
  fetchCartItems,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
} from "@/lib/supabase/cart";

export function GlobalCartPageClient() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckoutSheetOpen, setIsCheckoutSheetOpen] = useState(false);

  const loadCartItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const items = await fetchCartItems();
      setCartItems(items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar el carrito.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCartItems();
  }, [loadCartItems]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.quantity * item.product.priceUsd,
        0,
      ),
    [cartItems],
  );

  // Determine the primary shop from the cart (first shop group)
  const primaryShop = useMemo(() => {
    if (cartItems.length === 0) return null;
    const first = cartItems[0].product;
    const shopSubtotal = cartItems
      .filter((item) => item.product.shopSlug === first.shopSlug)
      .reduce((total, item) => total + item.quantity * item.product.priceUsd, 0);
    return {
      slug: first.shopSlug,
      name: first.shopName,
      athMovilPhone: first.shopAthMovilPhone,
      subtotal: shopSubtotal,
    };
  }, [cartItems]);

  const handleIncrease = useCallback(
    async (item: CartItem) => {
      const previousItems = cartItems;
      const nextQuantity = item.quantity + 1;

      setCartItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: nextQuantity } : entry,
        ),
      );

      try {
        const result = await setCartItemQuantity(item.id, nextQuantity);
        if (result.unauthorized) {
          router.push("/sign-in?next=/carrito");
        }
      } catch (error) {
        console.error("No se pudo actualizar la cantidad:", error);
        setCartItems(previousItems);
      }
    },
    [cartItems, router],
  );

  const handleDecrease = useCallback(
    async (item: CartItem) => {
      const previousItems = cartItems;
      const nextQuantity = item.quantity - 1;

      setCartItems((current) =>
        nextQuantity <= 0
          ? current.filter((entry) => entry.id !== item.id)
          : current.map((entry) =>
              entry.id === item.id ? { ...entry, quantity: nextQuantity } : entry,
            ),
      );

      try {
        const result = await setCartItemQuantity(item.id, nextQuantity);
        if (result.unauthorized) {
          router.push("/sign-in?next=/carrito");
        }
      } catch (error) {
        console.error("No se pudo actualizar la cantidad:", error);
        setCartItems(previousItems);
      }
    },
    [cartItems, router],
  );

  const handleRemove = useCallback(
    async (item: CartItem) => {
      const previousItems = cartItems;
      setCartItems((current) => current.filter((entry) => entry.id !== item.id));

      try {
        const result = await removeCartItem(item.id);
        if (result.unauthorized) {
          router.push("/sign-in?next=/carrito");
        }
      } catch (error) {
        console.error("No se pudo eliminar el producto:", error);
        setCartItems(previousItems);
      }
    },
    [cartItems, router],
  );

  const CheckoutButton = useCallback(
    ({ className }: { className?: string }) => {
      if (!primaryShop) return null;

      if (!primaryShop.athMovilPhone) {
        return (
          <div className={className}>
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-[var(--color-gray)] py-3 text-sm font-semibold text-[var(--color-gray-500)] cursor-not-allowed"
            >
              Proceder al pago
            </button>
            <p className="mt-2 text-center text-[11px] text-[var(--color-gray-500)]">
              Esta tienda aún no acepta pagos en línea.
            </p>
          </div>
        );
      }

      return (
        <button
          type="button"
          onClick={() => setIsCheckoutSheetOpen(true)}
          className={[
            "w-full rounded-full bg-[var(--color-carbon)] py-3 text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Pagar con ATH Móvil
        </button>
      );
    },
    [primaryShop],
  );

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-6 pb-28 lg:pb-8 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-4xl">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
          {/* Cart items */}
          <section className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]">
            <header className="mb-5">
              <h1 className="text-2xl font-bold leading-none text-[var(--color-carbon)]">
                Carrito
              </h1>
            </header>

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-8 text-center">
                <p className="text-base font-semibold text-[var(--color-carbon)]">
                  Cargando carrito...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {errorMessage}
              </div>
            ) : cartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray)] px-4 py-8 text-center">
                <p className="text-base font-semibold text-[var(--color-carbon)]">
                  Tu carrito esta vacio.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-1 lg:space-y-4">
                  {cartItems.map((item) => {
                    const hasProductRoute = Boolean(item.product.shopSlug);
                    const productHref = hasProductRoute
                      ? `/${item.product.shopSlug}/producto/${item.product.productId}`
                      : null;

                    return (
                      <article key={item.id} className="rounded-2xl border border-[var(--color-gray)] p-3">
                        <div className="flex gap-3">
                          <div className="relative h-[84px] w-[84px] overflow-hidden rounded-2xl bg-[var(--color-gray)]">
                            <Image
                              src={item.product.imageUrl}
                              alt={item.product.alt}
                              fill
                              className="object-cover"
                              sizes="84px"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[var(--color-gray-500)]">
                              {item.product.shopName}
                            </p>

                            {productHref ? (
                              <Link
                                href={productHref}
                                className="mt-0.5 block truncate text-sm font-semibold text-[var(--color-carbon)]"
                              >
                                {item.product.name}
                              </Link>
                            ) : (
                              <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-carbon)]">
                                {item.product.name}
                              </p>
                            )}

                            <p className="mt-1 text-sm font-semibold text-[var(--color-carbon)]">
                              {formatUsd(item.product.priceUsd)}
                            </p>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="inline-flex items-center gap-4 rounded-full border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-1 text-sm leading-none text-[var(--color-carbon)]">
                                <button
                                  type="button"
                                  aria-label="Reducir cantidad"
                                  onClick={() => void handleDecrease(item)}
                                >
                                  −
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                  type="button"
                                  aria-label="Aumentar cantidad"
                                  onClick={() => void handleIncrease(item)}
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--color-danger)]"
                                onClick={() => void handleRemove(item)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Subtotal + checkout — mobile only (desktop shows in aside) */}
                <div className="mt-5 lg:hidden">
                  <div className="flex items-center justify-between rounded-2xl bg-[var(--color-gray)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--color-carbon)]">Subtotal</p>
                    <p className="text-sm font-bold text-[var(--color-carbon)]">
                      {formatUsd(subtotal)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <CheckoutButton />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Desktop order summary */}
          {cartItems.length > 0 ? (
            <aside className="hidden lg:block lg:sticky lg:top-8">
              <div className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]">
                <h2 className="mb-4 text-lg font-bold leading-none text-[var(--color-carbon)]">
                  Resumen del pedido
                </h2>
                <div className="flex items-center justify-between rounded-2xl bg-[var(--color-gray)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--color-carbon)]">Subtotal</p>
                  <p className="text-sm font-bold text-[var(--color-carbon)]">
                    {formatUsd(subtotal)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-[var(--color-gray-500)]">
                  Los impuestos y el envío se calculan al finalizar la compra.
                </p>
                <div className="mt-4">
                  <CheckoutButton />
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </main>

      <BackHomeBottomNav />

      {primaryShop?.athMovilPhone ? (
        <AthMovilCheckoutSheet
          shopSlug={primaryShop.slug}
          shopName={primaryShop.name}
          athMovilPhone={primaryShop.athMovilPhone}
          totalUsd={primaryShop.subtotal}
          isOpen={isCheckoutSheetOpen}
          onClose={() => setIsCheckoutSheetOpen(false)}
        />
      ) : null}
    </div>
  );
}
