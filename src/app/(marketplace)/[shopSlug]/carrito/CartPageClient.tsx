"use client";

import Image from "next/image";
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
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";
import { fetchAccountSnapshot } from "@/lib/account/client";
import { formatUsd } from "@/lib/formatters";
import {
  createAthMovilCheckout,
  createStripeCheckoutSession,
  type CheckoutBuyerInput,
  type CheckoutFulfillmentInput,
} from "@/lib/orders/client";
import { fetchPublicShopPolicies } from "@/lib/policies/client";
import type { PublicShopPoliciesResponse, PolicyType } from "@/lib/policies/types";
import type { ShopDetail } from "@/lib/supabase/shop-types";
import {
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
  const [activeCheckoutMethod, setActiveCheckoutMethod] = useState<"stripe" | "ath_movil" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [policiesData, setPoliciesData] = useState<PublicShopPoliciesResponse | null>(null);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [hasAcceptedRequiredPolicies, setHasAcceptedRequiredPolicies] = useState(false);
  const [buyerInput, setBuyerInput] = useState<CheckoutBuyerInput>({
    fullName: "",
    email: "",
    phone: "",
  });
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"shipping" | "pickup">("shipping");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZipCode, setShippingZipCode] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [athReceiptFile, setAthReceiptFile] = useState<File | null>(null);
  const [athReceiptNote, setAthReceiptNote] = useState("");
  const [activePolicyModalType, setActivePolicyModalType] = useState<PolicyType | null>(null);
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
  const shippingFeeUsd = fulfillmentMethod === "shipping" ? shop.shippingFlatFeeUsd : 0;
  const totalUsd = subtotal + shippingFeeUsd;

  const activeMenuItem = useMemo(
    () => cartItems.find((item) => item.id === menuItemId) ?? null,
    [cartItems, menuItemId],
  );
  const shouldShowShopHeader = !isLoading && !loadError && cartItems.length > 0;
  const canCheckout = Boolean(
    policiesData?.requiredPolicyVersionIds &&
      hasAcceptedRequiredPolicies &&
      !isLoadingPolicies,
  );
  const supportsStripe = shop.acceptsStripePayments;
  const supportsAthMovil = Boolean(shop.athMovilPhone);
  const hasAnyPaymentMethod = supportsStripe || supportsAthMovil;
  const activePolicyModal =
    activePolicyModalType && policiesData?.policies
      ? policiesData.policies[activePolicyModalType] ?? null
      : null;
  const activePolicyModalTitle =
    activePolicyModalType === "terms"
      ? "Términos y condiciones"
      : activePolicyModalType === "shipping"
        ? "Política de envío"
        : activePolicyModalType === "refund"
          ? "Política de reembolso"
          : activePolicyModalType === "privacy"
            ? "Política de privacidad"
            : "";

  useBodyScrollLock(Boolean(menuItemId || activePolicyModalType));
  useEscapeKey(Boolean(menuItemId || activePolicyModalType), () => {
    setMenuItemId(null);
    setActivePolicyModalType(null);
  });

  useEffect(() => {
    if (menuItemId && !activeMenuItem) {
      setMenuItemId(null);
    }
  }, [activeMenuItem, menuItemId]);

  const loadPolicies = useCallback(async () => {
    setIsLoadingPolicies(true);
    setPoliciesError(null);

    try {
      const response = await fetchPublicShopPolicies(shop.slug);
      setPoliciesData(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar las políticas.";
      setPoliciesError(message);
      setPoliciesData(null);
    } finally {
      setIsLoadingPolicies(false);
    }
  }, [shop.slug]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  useEffect(() => {
    let cancelled = false;

    async function loadBuyerSnapshot() {
      try {
        const snapshot = await fetchAccountSnapshot();
        if (cancelled) {
          return;
        }

        setBuyerInput({
          fullName: snapshot.fullName,
          email: snapshot.email,
          phone: snapshot.phone,
        });
        setShippingAddress(snapshot.address);
        setShippingZipCode(snapshot.zipCode);
      } catch {
        // The checkout APIs still validate auth and required fields.
      }
    }

    void loadBuyerSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const buildCheckoutPayload = useCallback(() => {
    if (!policiesData?.requiredPolicyVersionIds) {
      throw new Error(
        "La tienda no tiene Términos y Política de envío publicados. No se puede continuar.",
      );
    }

    if (!hasAcceptedRequiredPolicies) {
      throw new Error("Debes aceptar Términos y Política de envío para continuar.");
    }

    if (!hasAnyPaymentMethod) {
      throw new Error("Esta tienda todavía no configuró un método de pago.");
    }

    const trimmedPhone = buyerInput.phone?.trim() ?? "";
    if (!trimmedPhone) {
      throw new Error("Debes escribir un teléfono para continuar.");
    }

    const fulfillment: CheckoutFulfillmentInput =
      fulfillmentMethod === "pickup"
        ? {
            method: "pickup",
            pickupNotes: pickupNotes.trim() || null,
          }
        : {
            method: "shipping",
            shippingAddress: shippingAddress.trim(),
            shippingZipCode: shippingZipCode.trim(),
          };

    return {
      shopSlug: shop.slug,
      buyer: {
        fullName: buyerInput.fullName?.trim() || null,
        email: buyerInput.email?.trim() || null,
        phone: trimmedPhone,
      },
      fulfillment,
      policyAcceptance: {
        shopId: policiesData.shopId,
        termsVersionId: policiesData.requiredPolicyVersionIds.terms,
        shippingVersionId: policiesData.requiredPolicyVersionIds.shipping,
        acceptedAt: new Date().toISOString(),
        acceptanceText: "Acepto Términos y Política de envío de esta tienda.",
      },
    };
  }, [
    buyerInput.email,
    buyerInput.fullName,
    buyerInput.phone,
    fulfillmentMethod,
    hasAcceptedRequiredPolicies,
    hasAnyPaymentMethod,
    pickupNotes,
    policiesData,
    shippingAddress,
    shippingZipCode,
    shop.slug,
  ]);

  const handleStripeCheckout = useCallback(async () => {
    setIsCheckingOut(true);
    setActiveCheckoutMethod("stripe");
    setCheckoutError(null);

    try {
      const payload = buildCheckoutPayload();
      const result = await createStripeCheckoutSession(payload);
      window.location.assign(result.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo abrir el pago con tarjeta.";
      setCheckoutError(message);
      if (message.toLowerCase().includes("no autenticado")) {
        router.push(`/sign-in?next=${encodeURIComponent(`/${shop.slug}/carrito`)}`);
      }
    } finally {
      setIsCheckingOut(false);
      setActiveCheckoutMethod(null);
    }
  }, [buildCheckoutPayload, router, shop.slug]);

  const handleAthMovilCheckout = useCallback(async () => {
    setIsCheckingOut(true);
    setActiveCheckoutMethod("ath_movil");
    setCheckoutError(null);

    try {
      if (!athReceiptFile) {
        throw new Error("Debes subir el recibo de ATH Móvil para enviar la orden.");
      }

      const payload = buildCheckoutPayload();
      await createAthMovilCheckout({
        payload,
        receipt: athReceiptFile,
        receiptNote: athReceiptNote.trim() || null,
      });

      await loadShopCartItems();
      router.push("/ordenes");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar la orden.";
      setCheckoutError(message);
      if (message.toLowerCase().includes("no autenticado")) {
        router.push(`/sign-in?next=${encodeURIComponent(`/${shop.slug}/carrito`)}`);
      }
    } finally {
      setIsCheckingOut(false);
      setActiveCheckoutMethod(null);
    }
  }, [
    athReceiptFile,
    athReceiptNote,
    buildCheckoutPayload,
    loadShopCartItems,
    router,
    shop.slug,
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-6 pb-28 lg:pb-8 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-4xl">
        <section className="rounded-[2rem] border border-[var(--color-gray)] bg-[var(--color-white)] p-5 shadow-[0_16px_34px_var(--shadow-black-008)]">
          {shouldShowShopHeader ? (
            <header className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-gray-border)] bg-[var(--color-gray-icon)] text-xl font-bold text-[var(--color-carbon)]">
                {shop.vendorName.charAt(0).toUpperCase()}
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
          ) : null}

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
            </div>
          ) : (
            <>
              <div className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {cartItems.map((item) => (
                <article key={item.id}>
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
              </div>

              <div className="mb-5 flex items-center justify-between">
                <p className="text-lg font-medium leading-none text-[var(--color-carbon)]">Subtotal</p>
                <p className="text-lg font-semibold leading-none text-[var(--color-carbon)]">
                  {formatUsd(subtotal)}
                </p>
              </div>

              <div className="mb-4 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
                <p className="text-xs font-semibold text-[var(--color-gray-500)]">
                  Contacto del comprador
                </p>
                <div className="mt-3 grid gap-3">
                  <input
                    type="text"
                    value={buyerInput.fullName ?? ""}
                    onChange={(event) =>
                      setBuyerInput((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    placeholder="Nombre"
                    className="rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                  />
                  <input
                    type="email"
                    value={buyerInput.email ?? ""}
                    onChange={(event) =>
                      setBuyerInput((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="Correo electrónico"
                    className="rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                  />
                  <input
                    type="tel"
                    value={buyerInput.phone ?? ""}
                    onChange={(event) =>
                      setBuyerInput((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="Teléfono"
                    className="rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
                <p className="text-xs font-semibold text-[var(--color-gray-500)]">
                  Entrega
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("shipping")}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      fulfillmentMethod === "shipping"
                        ? "bg-[var(--color-carbon)] text-[var(--color-white)]"
                        : "border border-[var(--color-gray)] text-[var(--color-carbon)]",
                    ].join(" ")}
                  >
                    Envío
                  </button>
                  {shop.offersPickup ? (
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("pickup")}
                      className={[
                        "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                        fulfillmentMethod === "pickup"
                          ? "bg-[var(--color-carbon)] text-[var(--color-white)]"
                          : "border border-[var(--color-gray)] text-[var(--color-carbon)]",
                      ].join(" ")}
                    >
                      Recogido
                    </button>
                  ) : null}
                </div>

                {fulfillmentMethod === "shipping" ? (
                  <div className="mt-3 grid gap-3">
                    <textarea
                      rows={3}
                      value={shippingAddress}
                      onChange={(event) => setShippingAddress(event.target.value)}
                      placeholder="Dirección completa"
                      className="rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={shippingZipCode}
                      onChange={(event) =>
                        setShippingZipCode(event.target.value.replace(/\D/g, "").slice(0, 5))
                      }
                      placeholder="Código postal"
                      className="rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <textarea
                      rows={2}
                      value={pickupNotes}
                      onChange={(event) => setPickupNotes(event.target.value)}
                      placeholder="Notas para coordinar el recogido (opcional)"
                      className="w-full rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="mb-4 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3">
                <p className="text-xs font-semibold text-[var(--color-gray-500)]">
                  Políticas requeridas
                </p>
                {isLoadingPolicies ? (
                  <p className="mt-1 text-xs text-[var(--color-carbon)]">Cargando políticas...</p>
                ) : policiesError ? (
                  <p className="mt-1 text-xs text-[var(--color-danger)]">{policiesError}</p>
                ) : policiesData?.requiredPolicyVersionIds ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                        onClick={() => setActivePolicyModalType("terms")}
                      >
                        Ver Términos
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                        onClick={() => setActivePolicyModalType("shipping")}
                      >
                        Ver Política de envío
                      </button>
                    </div>
                    <label className="mt-3 flex items-start gap-2 text-xs text-[var(--color-carbon)]">
                      <input
                        type="checkbox"
                        checked={hasAcceptedRequiredPolicies}
                        onChange={(event) =>
                          setHasAcceptedRequiredPolicies(event.target.checked)
                        }
                        className="mt-0.5"
                      />
                      <span>Acepto Términos y Política de envío de esta tienda.</span>
                    </label>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-[var(--color-danger)]">
                    Esta tienda aún no tiene políticas requeridas publicadas.
                  </p>
                )}
              </div>

              <div className="mb-4 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray)] p-4">
                <div className="flex items-center justify-between text-sm text-[var(--color-carbon)]">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatUsd(subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[var(--color-carbon)]">
                  <span>Envío</span>
                  <span className="font-semibold">
                    {fulfillmentMethod === "shipping"
                      ? formatUsd(shippingFeeUsd)
                      : "Gratis"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-gray-border)] pt-3 text-base text-[var(--color-carbon)]">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">{formatUsd(totalUsd)}</span>
                </div>
              </div>

              {checkoutError ? (
                <p className="mb-3 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-3 py-2 text-xs text-[var(--color-danger)]">
                  {checkoutError}
                </p>
              ) : null}

              {supportsStripe ? (
                <button
                  type="button"
                  disabled={isCheckingOut || !canCheckout}
                  className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-base font-semibold text-[var(--color-white)] shadow-[0_10px_24px_var(--shadow-brand-020)] disabled:opacity-70"
                  onClick={() => void handleStripeCheckout()}
                >
                  {isCheckingOut && activeCheckoutMethod === "stripe"
                    ? "Abriendo Stripe..."
                    : "Pagar con tarjeta"}
                </button>
              ) : null}

              {supportsAthMovil ? (
                <div className="mt-4 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-carbon)]">
                    Pagar con ATH Móvil
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                    Sube el recibo del pago enviado al {shop.athMovilPhone}.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setAthReceiptFile(event.target.files?.[0] ?? null)
                    }
                    className="mt-3 block w-full text-sm"
                  />
                  <textarea
                    rows={2}
                    value={athReceiptNote}
                    onChange={(event) => setAthReceiptNote(event.target.value)}
                    placeholder="Nota opcional para la tienda"
                    className="mt-3 w-full rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    disabled={isCheckingOut || !canCheckout}
                    className="mt-3 w-full rounded-3xl border border-[var(--color-carbon)] px-6 py-3.5 text-base font-semibold text-[var(--color-carbon)] disabled:opacity-70"
                    onClick={() => void handleAthMovilCheckout()}
                  >
                    {isCheckingOut && activeCheckoutMethod === "ath_movil"
                      ? "Enviando comprobante..."
                      : "Enviar comprobante ATH Móvil"}
                  </button>
                </div>
              ) : null}

              {!supportsStripe && !supportsAthMovil ? (
                <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  Esta tienda aún no configuró un método de pago.
                </div>
              ) : null}
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

      {activePolicyModalType ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay-black-055)]"
            aria-label="Cerrar política"
            onClick={() => setActivePolicyModalType(null)}
          />
          <section className="absolute inset-x-4 top-1/2 mx-auto max-w-3xl -translate-y-1/2 rounded-3xl bg-[var(--color-white)] p-5 shadow-[0_30px_80px_var(--shadow-black-035)] md:max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-carbon)]">
                {activePolicyModalTitle}
              </h3>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
                onClick={() => setActivePolicyModalType(null)}
                aria-label="Cerrar"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray)] p-3">
              <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-carbon)]">
                {activePolicyModal?.body ?? "No disponible."}
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {menuItemId ? (
        <div className="fixed inset-0 z-40">
          <button type="button"
            className="absolute inset-0 bg-[var(--overlay-black-055)]"
            aria-label="Cerrar menu del producto"
            onClick={() => setMenuItemId(null)}
          />

          <section className="absolute inset-x-4 top-1/2 mx-auto max-w-3xl -translate-y-1/2 rounded-[2.25rem] bg-[var(--color-white)] p-8 shadow-[0_30px_80px_var(--shadow-black-035)] md:max-w-2xl">
            <div className="mb-7 flex items-start justify-between">
              <h3 className="text-3xl font-bold leading-none text-[var(--color-black)]">
                Administrar producto
              </h3>
              <button type="button"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-gray-100)] text-[var(--color-carbon)] transition-colors hover:bg-[var(--color-gray-200)]"
                aria-label="Cerrar menu"
                onClick={() => setMenuItemId(null)}
              >
                <CloseIcon className="h-5 w-5" />
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
