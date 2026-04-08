"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BackHomeBottomNav } from "@/components/navigation/back-home-bottom-nav";
import { ShopCheckoutSheet } from "@/components/cart/shop-checkout-sheet";
import { formatUsd } from "@/lib/formatters";
import { fetchAccountSnapshot, type AccountSnapshot } from "@/lib/account/client";
import {
  fetchCartItems,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
} from "@/lib/supabase/cart";

type ShopGroup = {
  shopSlug: string;
  shopName: string;
  shopOffersPickup: boolean;
  shopShippingFlatFeeUsd: number;
  shopAcceptsStripe: boolean;
  shopAthMovilPhone: string | null;
  items: CartItem[];
  subtotal: number;
};

type CheckoutFlowState =
  | { phase: "idle" }
  | { phase: "checking_out"; queuedSlugs: string[]; currentIndex: number }
  | { phase: "done"; completedCount: number };

function groupCartItems(cartItems: CartItem[]): ShopGroup[] {
  const map = new Map<string, ShopGroup>();

  for (const item of cartItems) {
    const { shopSlug } = item.product;
    const existing = map.get(shopSlug);
    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.product.priceUsd * item.quantity;
    } else {
      map.set(shopSlug, {
        shopSlug,
        shopName: item.product.shopName,
        shopOffersPickup: item.product.shopOffersPickup,
        shopShippingFlatFeeUsd: item.product.shopShippingFlatFeeUsd,
        shopAcceptsStripe: item.product.shopAcceptsStripePayments,
        shopAthMovilPhone: item.product.shopAthMovilPhone,
        items: [item],
        subtotal: item.product.priceUsd * item.quantity,
      });
    }
  }

  return Array.from(map.values());
}

export function GlobalCartPageClient() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountSnapshot | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [selectedShopSlugs, setSelectedShopSlugs] = useState<Set<string>>(new Set());
  const [checkoutFlow, setCheckoutFlow] = useState<CheckoutFlowState>({ phase: "idle" });

  const loadCartItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const items = await fetchCartItems();
      setCartItems(items);
      // Auto-select all shops
      const slugs = new Set<string>();
      for (const item of items) {
        slugs.add(item.product.shopSlug);
      }
      setSelectedShopSlugs(slugs);
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

  const loadProfile = useCallback(async () => {
    try {
      const snapshot = await fetchAccountSnapshot();
      setProfile(snapshot);
      setProfileLoaded(true);
    } catch {
      // Retry once — Supabase auth can race on initial page load
      try {
        await new Promise((r) => setTimeout(r, 500));
        const snapshot = await fetchAccountSnapshot();
        setProfile(snapshot);
      } catch {
        // Profile truly unavailable
      }
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const shopGroups = useMemo(() => groupCartItems(cartItems), [cartItems]);

  const selectedGroups = useMemo(
    () => shopGroups.filter((g) => selectedShopSlugs.has(g.shopSlug)),
    [shopGroups, selectedShopSlugs],
  );

  const selectedTotal = useMemo(
    () => selectedGroups.reduce((sum, g) => sum + g.subtotal, 0),
    [selectedGroups],
  );

  const toggleShop = useCallback((slug: string) => {
    setSelectedShopSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

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

  const handleStartCheckout = useCallback(() => {
    const queuedSlugs = shopGroups
      .filter((g) => selectedShopSlugs.has(g.shopSlug))
      .map((g) => g.shopSlug);

    if (queuedSlugs.length === 0) return;

    setCheckoutFlow({ phase: "checking_out", queuedSlugs, currentIndex: 0 });
  }, [shopGroups, selectedShopSlugs]);

  const handleSheetSuccess = useCallback(async () => {
    if (checkoutFlow.phase !== "checking_out") return;

    const nextIndex = checkoutFlow.currentIndex + 1;

    if (nextIndex < checkoutFlow.queuedSlugs.length) {
      setCheckoutFlow({ ...checkoutFlow, currentIndex: nextIndex });
    } else {
      const completedCount = checkoutFlow.queuedSlugs.length;
      setCheckoutFlow({ phase: "done", completedCount });
      await loadCartItems();
      router.push("/ordenes");
      router.refresh();
    }
  }, [checkoutFlow, loadCartItems, router]);

  const handleSheetClose = useCallback(() => {
    setCheckoutFlow({ phase: "idle" });
  }, []);

  const activeShopGroup = useMemo(() => {
    if (checkoutFlow.phase !== "checking_out") return null;
    const slug = checkoutFlow.queuedSlugs[checkoutFlow.currentIndex];
    return shopGroups.find((g) => g.shopSlug === slug) ?? null;
  }, [checkoutFlow, shopGroups]);

  const profileMissingPhone = profile !== null && !profile.phone.trim();

  const profileLoadFailed = profileLoaded && !profile;

  const checkoutButtonLabel = useMemo(() => {
    if (!profileLoaded) return "Cargando...";
    if (profileLoadFailed && cartItems.length === 0) return "Inicia sesión para continuar";
    if (profileLoadFailed) return "Error cargando perfil. Toca para reintentar.";
    if (selectedGroups.length === 0) return "Selecciona al menos una tienda";
    if (profileMissingPhone) return "Completa tu perfil para continuar";
    return `Finalizar compra · ${formatUsd(selectedTotal)}`;
  }, [profileLoaded, profileLoadFailed, cartItems.length, selectedGroups.length, profileMissingPhone, selectedTotal]);

  const checkoutButtonDisabled = profileLoadFailed
    ? !profileLoaded
    : !profileLoaded || !profile || selectedGroups.length === 0 || profileMissingPhone;

  const handleCheckoutButtonClick = useCallback(() => {
    if (profileLoadFailed) {
      setProfileLoaded(false);
      void loadProfile();
      return;
    }
    handleStartCheckout();
  }, [profileLoadFailed, loadProfile, handleStartCheckout]);

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-6 pb-28 lg:pb-8 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-4xl">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
          {/* Cart */}
          <section>
            <header className="mb-5">
              <h1 className="text-2xl font-bold leading-none text-[var(--color-carbon)]">
                Carrito
              </h1>
            </header>

            {/* Profile incomplete banner */}
            {profileMissingPhone ? (
              <div className="mb-4 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
                <p className="font-semibold">Tu perfil está incompleto.</p>
                <p className="mt-0.5 text-xs">
                  Se requiere teléfono para completar tu compra.{" "}
                  <Link href="/cuenta" className="underline underline-offset-2">
                    Completar perfil →
                  </Link>
                </p>
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-8 text-center shadow-[0_16px_34px_var(--shadow-black-008)]">
                <p className="text-base font-semibold text-[var(--color-carbon)]">
                  Cargando carrito...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {errorMessage}
              </div>
            ) : cartItems.length === 0 ? (
              <div className="rounded-[2rem] bg-[var(--color-white)] px-4 py-8 text-center shadow-[0_16px_34px_var(--shadow-black-008)]">
                <p className="text-base font-semibold text-[var(--color-carbon)]">
                  Tu carrito está vacío.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {shopGroups.map((group) => (
                  <div
                    key={group.shopSlug}
                    className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]"
                  >
                    {/* Shop header with checkbox */}
                    <label className="mb-4 flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedShopSlugs.has(group.shopSlug)}
                        onChange={() => toggleShop(group.shopSlug)}
                        className="h-5 w-5 rounded accent-[var(--color-carbon)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[var(--color-carbon)]">
                          {group.shopName}
                        </p>
                        <p className="text-xs text-[var(--color-gray-500)]">
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "producto" : "productos"} ·{" "}
                          {formatUsd(group.subtotal)}
                        </p>
                      </div>
                    </label>

                    {/* Items */}
                    <div className="space-y-4 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-1 lg:space-y-4">
                      {group.items.map((item) => {
                        const productHref = `/${item.product.shopSlug}/producto/${item.product.productId}`;

                        return (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-[var(--color-gray)] p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-[84px] w-[84px] overflow-hidden rounded-2xl bg-[var(--color-gray)]">
                                {item.product.imageUrl ? (
                                  <Image
                                    src={item.product.imageUrl}
                                    alt={item.product.alt}
                                    fill
                                    className="object-cover"
                                    sizes="84px"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-center text-[10px] leading-tight text-[var(--color-gray-500)]">
                                    Sin foto
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={productHref}
                                  className="mt-0.5 block truncate text-sm font-semibold text-[var(--color-carbon)]"
                                >
                                  {item.product.name}
                                </Link>

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
                  </div>
                ))}

                {/* Mobile checkout bar */}
                <div className="lg:hidden">
                  <div className="mb-3 flex items-center justify-between rounded-2xl bg-[var(--color-white)] px-4 py-3 shadow-[0_4px_16px_var(--shadow-black-008)]">
                    <p className="text-sm font-semibold text-[var(--color-carbon)]">
                      Total seleccionado
                    </p>
                    <p className="text-sm font-bold text-[var(--color-carbon)]">
                      {formatUsd(selectedTotal)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutButtonDisabled}
                    onClick={handleCheckoutButtonClick}
                    className="block w-full rounded-full bg-[var(--color-carbon)] py-3 text-center text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {checkoutButtonLabel}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Desktop order summary */}
          {cartItems.length > 0 ? (
            <aside className="hidden lg:block lg:sticky lg:top-8">
              <div className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]">
                <h2 className="mb-4 text-lg font-bold leading-none text-[var(--color-carbon)]">
                  Resumen del pedido
                </h2>

                <div className="space-y-2 mb-4">
                  {shopGroups.map((group) => (
                    <div
                      key={group.shopSlug}
                      className={[
                        "flex items-center justify-between rounded-2xl px-4 py-3 text-sm",
                        selectedShopSlugs.has(group.shopSlug)
                          ? "bg-[var(--color-gray)]"
                          : "bg-[var(--color-white)] opacity-40",
                      ].join(" ")}
                    >
                      <span className="font-medium truncate mr-2">{group.shopName}</span>
                      <span className="font-semibold shrink-0">{formatUsd(group.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {selectedGroups.length > 0 ? (
                  <div className="flex items-center justify-between rounded-2xl bg-[var(--color-gray)] px-4 py-3 mb-3">
                    <p className="text-sm font-semibold text-[var(--color-carbon)]">Total seleccionado</p>
                    <p className="text-sm font-bold text-[var(--color-carbon)]">
                      {formatUsd(selectedTotal)}
                    </p>
                  </div>
                ) : null}

                <p className="mb-4 text-xs text-[var(--color-gray-500)]">
                  Los impuestos y el envío se calculan al finalizar la compra.
                </p>

                <button
                  type="button"
                  disabled={checkoutButtonDisabled}
                  onClick={handleCheckoutButtonClick}
                  className="block w-full rounded-full bg-[var(--color-carbon)] py-3 text-center text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {checkoutButtonLabel}
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </main>

      <BackHomeBottomNav />

      {/* Checkout sheet */}
      {checkoutFlow.phase === "checking_out" && activeShopGroup && profile ? (
        <ShopCheckoutSheet
          key={activeShopGroup.shopSlug}
          shopSlug={activeShopGroup.shopSlug}
          shopName={activeShopGroup.shopName}
          shopItems={activeShopGroup.items}
          shopOffersPickup={activeShopGroup.shopOffersPickup}
          shopShippingFlatFeeUsd={activeShopGroup.shopShippingFlatFeeUsd}
          shopAcceptsStripe={activeShopGroup.shopAcceptsStripe}
          shopAthMovilPhone={activeShopGroup.shopAthMovilPhone}
          profile={profile}
          onSuccess={() => void handleSheetSuccess()}
          onClose={handleSheetClose}
        />
      ) : null}
    </div>
  );
}
