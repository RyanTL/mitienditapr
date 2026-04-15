"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BackHomeBottomNav } from "@/components/navigation/back-home-bottom-nav";
import { ShopCheckoutSheet } from "@/components/cart/shop-checkout-sheet";
import { FALLBACK_PRODUCT_IMAGE as CART_IMAGE_FALLBACK_URL, formatUsd } from "@/lib/formatters";
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
  shopContactPhone: string | null;
  shopContactInstagram: string | null;
  shopContactFacebook: string | null;
  shopContactWhatsapp: string | null;
  items: CartItem[];
  subtotal: number;
};

type CheckoutFlowState =
  | { phase: "idle" }
  | { phase: "checking_out"; shopSlug: string }
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
        shopContactPhone: item.product.shopContactPhone,
        shopContactInstagram: item.product.shopContactInstagram,
        shopContactFacebook: item.product.shopContactFacebook,
        shopContactWhatsapp: item.product.shopContactWhatsapp,
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
  const [selectedShopSlug, setSelectedShopSlug] = useState<string | null>(null);
  const [checkoutFlow, setCheckoutFlow] = useState<CheckoutFlowState>({ phase: "idle" });
  const [failedImageItemIds, setFailedImageItemIds] = useState<Set<string>>(new Set());

  const loadCartItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const items = await fetchCartItems();
      setCartItems(items);
      const firstShopSlug = items[0]?.product.shopSlug ?? null;
      setSelectedShopSlug((current) => {
        if (current && items.some((item) => item.product.shopSlug === current)) {
          return current;
        }
        return firstShopSlug;
      });
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
    // Supabase auth can race on initial page load — retry with back-off
    const delays = [0, 600, 1500];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        const snapshot = await fetchAccountSnapshot();
        setProfile(snapshot);
        setProfileLoaded(true);
        return;
      } catch {
        // Try next attempt
      }
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const shopGroups = useMemo(() => groupCartItems(cartItems), [cartItems]);

  const selectedGroup = useMemo(
    () => shopGroups.find((g) => g.shopSlug === selectedShopSlug) ?? null,
    [shopGroups, selectedShopSlug],
  );

  const selectedTotal = useMemo(
    () => selectedGroup?.subtotal ?? 0,
    [selectedGroup],
  );

  const toggleShop = useCallback((slug: string) => {
    setSelectedShopSlug((current) => (current === slug ? null : slug));
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
    if (!selectedShopSlug) return;
    setCheckoutFlow({ phase: "checking_out", shopSlug: selectedShopSlug });
  }, [selectedShopSlug]);

  const handleSheetSuccess = useCallback(async () => {
    if (checkoutFlow.phase !== "checking_out") return;
    setCheckoutFlow({ phase: "done", completedCount: 1 });
    await loadCartItems();
    router.push("/ordenes");
    router.refresh();
  }, [checkoutFlow, loadCartItems, router]);

  const handleSheetClose = useCallback(() => {
    setCheckoutFlow({ phase: "idle" });
  }, []);

  const activeShopGroup = useMemo(() => {
    if (checkoutFlow.phase !== "checking_out") return null;
    return shopGroups.find((g) => g.shopSlug === checkoutFlow.shopSlug) ?? null;
  }, [checkoutFlow, shopGroups]);

  const profileLoadFailed = profileLoaded && !profile;

  const checkoutButtonLabel = useMemo(() => {
    if (!profileLoaded) return "Cargando...";
    if (profileLoadFailed && cartItems.length === 0) return "Inicia sesión para continuar";
    if (!selectedGroup) return "Selecciona una tienda";
    return `Finalizar compra · ${formatUsd(selectedTotal)}`;
  }, [profileLoaded, profileLoadFailed, cartItems.length, selectedGroup, selectedTotal]);

  const checkoutButtonDisabled = !profileLoaded || !selectedGroup;

  const handleCheckoutButtonClick = useCallback(() => {
    if (profileLoadFailed) {
      handleStartCheckout();
      return;
    }
    handleStartCheckout();
  }, [profileLoadFailed, handleStartCheckout]);

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
              <p className="mt-2 text-sm text-[var(--color-gray-500)]">
                Selecciona una sola tienda por compra. Si quieres comprar en varias,
                completa cada pedido por separado.
              </p>
            </header>

            {profileLoadFailed ? (
              <div className="mb-4 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-carbon)]">
                No pudimos precargar tu perfil. Puedes completar teléfono y dirección dentro del checkout.
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
                        checked={selectedShopSlug === group.shopSlug}
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
                                {(item.product.imageUrl || failedImageItemIds.has(item.id)) ? (
                                  <Image
                                    src={
                                      failedImageItemIds.has(item.id)
                                        ? CART_IMAGE_FALLBACK_URL
                                        : (item.product.imageUrl || CART_IMAGE_FALLBACK_URL)
                                    }
                                    alt={item.product.alt}
                                    fill
                                    className="object-cover"
                                    sizes="84px"
                                    unoptimized
                                    onError={() => {
                                      setFailedImageItemIds((current) => {
                                        if (current.has(item.id)) {
                                          return current;
                                        }
                                        const next = new Set(current);
                                        next.add(item.id);
                                        return next;
                                      });
                                    }}
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
                        selectedShopSlug === group.shopSlug
                          ? "bg-[var(--color-gray)]"
                          : "bg-[var(--color-white)] opacity-40",
                      ].join(" ")}
                    >
                      <span className="font-medium truncate mr-2">{group.shopName}</span>
                      <span className="font-semibold shrink-0">{formatUsd(group.subtotal)}</span>
                    </div>
                  ))}
                </div>

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
      {checkoutFlow.phase === "checking_out" && activeShopGroup ? (
        <ShopCheckoutSheet
          key={activeShopGroup.shopSlug}
          shopSlug={activeShopGroup.shopSlug}
          shopName={activeShopGroup.shopName}
          shopItems={activeShopGroup.items}
          shopOffersPickup={activeShopGroup.shopOffersPickup}
          shopShippingFlatFeeUsd={activeShopGroup.shopShippingFlatFeeUsd}
          shopAcceptsStripe={activeShopGroup.shopAcceptsStripe}
          shopAthMovilPhone={activeShopGroup.shopAthMovilPhone}
          vendorContact={{
            phone: activeShopGroup.shopContactPhone,
            instagram: activeShopGroup.shopContactInstagram,
            facebook: activeShopGroup.shopContactFacebook,
            whatsapp: activeShopGroup.shopContactWhatsapp,
          }}
          profile={profile}
          onSuccess={() => void handleSheetSuccess()}
          onClose={handleSheetClose}
        />
      ) : null}
    </div>
  );
}
