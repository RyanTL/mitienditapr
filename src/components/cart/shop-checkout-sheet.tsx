"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CloseIcon } from "@/components/icons";
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";
import type { AccountSnapshot } from "@/lib/account/client";
import { formatUsd } from "@/lib/formatters";
import {
  createAthMovilCheckout,
  createStripeCheckoutSession,
  type CheckoutFulfillmentInput,
} from "@/lib/orders/client";
import { fetchPublicShopPolicies } from "@/lib/policies/client";
import type { PublicShopPoliciesResponse, PolicyType } from "@/lib/policies/types";
import type { CartItem } from "@/lib/supabase/cart";

type ShopCheckoutSheetProps = {
  shopSlug: string;
  shopName: string;
  shopItems: CartItem[];
  shopOffersPickup: boolean;
  shopShippingFlatFeeUsd: number;
  shopAcceptsStripe: boolean;
  shopAthMovilPhone: string | null;
  profile: AccountSnapshot;
  onSuccess: () => void;
  onClose: () => void;
};

export function ShopCheckoutSheet({
  shopSlug,
  shopName,
  shopItems,
  shopOffersPickup,
  shopShippingFlatFeeUsd,
  shopAcceptsStripe,
  shopAthMovilPhone,
  profile,
  onSuccess,
  onClose,
}: ShopCheckoutSheetProps) {
  const router = useRouter();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"shipping" | "pickup">("shipping");
  const [pickupNotes, setPickupNotes] = useState("");
  const [hasAcceptedRequiredPolicies, setHasAcceptedRequiredPolicies] = useState(false);
  const [policiesData, setPoliciesData] = useState<PublicShopPoliciesResponse | null>(null);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [activePolicyModalType, setActivePolicyModalType] = useState<PolicyType | null>(null);
  const [athReceiptFile, setAthReceiptFile] = useState<File | null>(null);
  const [athReceiptNote, setAthReceiptNote] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeCheckoutMethod, setActiveCheckoutMethod] = useState<"stripe" | "ath_movil" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleEscapeKey = useCallback(() => {
    if (activePolicyModalType) {
      setActivePolicyModalType(null);
    } else {
      onClose();
    }
  }, [activePolicyModalType, onClose]);

  useBodyScrollLock(true);
  useEscapeKey(true, handleEscapeKey);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingPolicies(true);
    setPoliciesError(null);

    fetchPublicShopPolicies(shopSlug)
      .then((response) => {
        if (!cancelled) setPoliciesData(response);
      })
      .catch((error) => {
        if (!cancelled) {
          setPoliciesError(
            error instanceof Error ? error.message : "No se pudieron cargar las políticas.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPolicies(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shopSlug]);

  const subtotal = shopItems.reduce(
    (total, item) => total + item.product.priceUsd * item.quantity,
    0,
  );
  const shippingFeeUsd = fulfillmentMethod === "shipping" ? shopShippingFlatFeeUsd : 0;
  const totalUsd = subtotal + shippingFeeUsd;

  const canCheckout = Boolean(
    policiesData?.requiredPolicyVersionIds && hasAcceptedRequiredPolicies && !isLoadingPolicies,
  );

  const profileBlockers: string[] = [];
  if (!profile.phone.trim()) {
    profileBlockers.push("Tu perfil no tiene teléfono.");
  }
  if (fulfillmentMethod === "shipping") {
    if (!profile.address.trim()) profileBlockers.push("Tu perfil no tiene dirección.");
    if (!profile.zipCode.trim()) profileBlockers.push("Tu perfil no tiene código postal.");
  }

  const activePolicyModal =
    activePolicyModalType && policiesData?.policies
      ? (policiesData.policies[activePolicyModalType] ?? null)
      : null;

  const activePolicyModalTitle =
    activePolicyModalType === "terms"
      ? "Términos y condiciones"
      : activePolicyModalType === "shipping"
        ? "Política de envío"
        : "";

  const buildCheckoutPayload = useCallback(() => {
    if (!policiesData?.requiredPolicyVersionIds) {
      throw new Error(
        "La tienda no tiene Términos y Política de envío publicados. No se puede continuar.",
      );
    }
    if (!hasAcceptedRequiredPolicies) {
      throw new Error("Debes aceptar Términos y Política de envío para continuar.");
    }
    if (!shopAcceptsStripe && !shopAthMovilPhone) {
      throw new Error("Esta tienda todavía no configuró un método de pago.");
    }

    const fulfillment: CheckoutFulfillmentInput =
      fulfillmentMethod === "pickup"
        ? { method: "pickup", pickupNotes: pickupNotes.trim() || null }
        : { method: "shipping" };

    return {
      shopSlug,
      buyer: {},
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
    fulfillmentMethod,
    hasAcceptedRequiredPolicies,
    pickupNotes,
    policiesData,
    shopAcceptsStripe,
    shopAthMovilPhone,
    shopSlug,
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
        router.push("/sign-in?next=/carrito");
      }
    } finally {
      setIsCheckingOut(false);
      setActiveCheckoutMethod(null);
    }
  }, [buildCheckoutPayload, router]);

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
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar la orden.";
      setCheckoutError(message);
      if (message.toLowerCase().includes("no autenticado")) {
        router.push("/sign-in?next=/carrito");
      }
    } finally {
      setIsCheckingOut(false);
      setActiveCheckoutMethod(null);
    }
  }, [athReceiptFile, athReceiptNote, buildCheckoutPayload, onSuccess, router]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-055)]"
        aria-label="Cerrar"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[2rem] bg-[var(--color-white)] pb-safe shadow-[0_-20px_60px_var(--shadow-black-035)] md:inset-x-auto md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:rounded-[2rem] md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] bg-[var(--color-white)] px-5 pt-5 pb-3 md:rounded-[2rem]">
          <div>
            <p className="text-xs font-medium text-[var(--color-gray-500)]">Pago</p>
            <h2 className="text-lg font-bold leading-none text-[var(--color-carbon)]">
              {shopName}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 pb-6">
          {/* Profile info */}
          <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--color-gray-500)]">Tu información</p>
              <Link
                href="/cuenta"
                className="text-xs font-semibold text-[var(--color-brand)] underline underline-offset-2"
              >
                Editar
              </Link>
            </div>
            <div className="mt-2 space-y-1 text-sm text-[var(--color-carbon)]">
              {profile.fullName ? (
                <p className="font-medium">{profile.fullName}</p>
              ) : null}
              {profile.phone ? (
                <p>{profile.phone}</p>
              ) : (
                <p className="text-[var(--color-danger)]">Sin teléfono</p>
              )}
              {profile.address ? (
                <p className="text-xs text-[var(--color-gray-500)]">{profile.address}</p>
              ) : null}
              {profile.zipCode ? (
                <p className="text-xs text-[var(--color-gray-500)]">CP {profile.zipCode}</p>
              ) : null}
            </div>
          </div>

          {/* Profile blockers */}
          {profileBlockers.length > 0 ? (
            <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] p-3 text-xs text-[var(--color-danger)]">
              <p className="font-semibold">Completa tu perfil para continuar:</p>
              <ul className="mt-1 list-disc pl-4">
                {profileBlockers.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
              <Link
                href="/cuenta"
                className="mt-2 block font-semibold underline underline-offset-2"
              >
                Ir a mi perfil →
              </Link>
            </div>
          ) : null}

          {/* Fulfillment method */}
          <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
            <p className="text-xs font-semibold text-[var(--color-gray-500)]">Entrega</p>
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
              {shopOffersPickup ? (
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
              <div className="mt-3 rounded-2xl bg-[var(--color-gray)] px-4 py-3 text-sm text-[var(--color-carbon)]">
                {profile.address ? (
                  <>
                    <p>{profile.address}</p>
                    {profile.zipCode ? (
                      <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">
                        CP {profile.zipCode}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[var(--color-danger)]">
                    Sin dirección.{" "}
                    <Link href="/cuenta" className="underline underline-offset-2">
                      Agrega una en tu perfil
                    </Link>
                    .
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  rows={2}
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="Notas para coordinar el recogido (opcional)"
                  className="w-full rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
                />
              </div>
            )}
          </div>

          {/* Policies */}
          <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3">
            <p className="text-xs font-semibold text-[var(--color-gray-500)]">Políticas requeridas</p>
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
                    onChange={(e) => setHasAcceptedRequiredPolicies(e.target.checked)}
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

          {/* Order summary */}
          <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray)] p-4">
            <div className="flex items-center justify-between text-sm text-[var(--color-carbon)]">
              <span>Subtotal</span>
              <span className="font-semibold">{formatUsd(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-[var(--color-carbon)]">
              <span>Envío</span>
              <span className="font-semibold">
                {fulfillmentMethod === "shipping" ? formatUsd(shippingFeeUsd) : "Gratis"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-gray-border)] pt-3 text-base text-[var(--color-carbon)]">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatUsd(totalUsd)}</span>
            </div>
          </div>

          {/* Checkout error */}
          {checkoutError ? (
            <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {checkoutError}
            </p>
          ) : null}

          {/* Payment buttons */}
          {shopAcceptsStripe ? (
            <button
              type="button"
              disabled={isCheckingOut || !canCheckout || profileBlockers.length > 0}
              className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-base font-semibold text-[var(--color-white)] shadow-[0_10px_24px_var(--shadow-brand-020)] disabled:opacity-70"
              onClick={() => void handleStripeCheckout()}
            >
              {isCheckingOut && activeCheckoutMethod === "stripe"
                ? "Abriendo Stripe..."
                : "Pagar con tarjeta"}
            </button>
          ) : null}

          {shopAthMovilPhone ? (
            <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
              <p className="text-sm font-semibold text-[var(--color-carbon)]">
                Pagar con ATH Móvil
              </p>
              <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                Sube el recibo del pago enviado al {shopAthMovilPhone}.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAthReceiptFile(e.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-sm"
              />
              <textarea
                rows={2}
                value={athReceiptNote}
                onChange={(e) => setAthReceiptNote(e.target.value)}
                placeholder="Nota opcional para la tienda"
                className="mt-3 w-full rounded-2xl border border-[var(--color-gray)] px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                disabled={isCheckingOut || !canCheckout || profileBlockers.length > 0}
                className="mt-3 w-full rounded-3xl border border-[var(--color-carbon)] px-6 py-3.5 text-base font-semibold text-[var(--color-carbon)] disabled:opacity-70"
                onClick={() => void handleAthMovilCheckout()}
              >
                {isCheckingOut && activeCheckoutMethod === "ath_movil"
                  ? "Enviando comprobante..."
                  : "Enviar comprobante ATH Móvil"}
              </button>
            </div>
          ) : null}

          {!shopAcceptsStripe && !shopAthMovilPhone ? (
            <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
              Esta tienda aún no configuró un método de pago.
            </div>
          ) : null}
        </div>
      </div>

      {/* Policy modal */}
      {activePolicyModalType ? (
        <div className="fixed inset-0 z-[60]">
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
    </div>
  );
}
