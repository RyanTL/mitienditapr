"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AthMovilCheckoutWizard,
  type VendorContactInfo,
} from "@/components/cart/ath-movil-checkout-wizard";
import { StripeCheckoutWizard } from "@/components/cart/stripe-checkout-wizard";
import { AthMovilIcon, CloseIcon } from "@/components/icons";
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";
import { saveCheckoutProfile, type AccountSnapshot } from "@/lib/account/client";
import { formatUsd } from "@/lib/formatters";
import {
  createStripeCheckoutSession,
  type CheckoutFulfillmentInput,
  type CheckoutRequestPayload,
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
  vendorContact: VendorContactInfo;
  profile: AccountSnapshot | null;
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
  vendorContact,
  profile,
  onSuccess,
  onClose,
}: ShopCheckoutSheetProps) {
  const router = useRouter();
  const [hasAcceptedRequiredPolicies, setHasAcceptedRequiredPolicies] = useState(true);
  const [policiesData, setPoliciesData] = useState<PublicShopPoliciesResponse | null>(null);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [activePolicyModalType, setActivePolicyModalType] = useState<PolicyType | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeCheckoutMethod, setActiveCheckoutMethod] = useState<"stripe" | "ath_movil" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutPhase, setCheckoutPhase] = useState<"form" | "success">("form");
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [buyerFullName, setBuyerFullName] = useState(profile?.fullName ?? "");
  const [buyerEmail, setBuyerEmail] = useState(profile?.email ?? "");
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone ?? "");
  const [shippingAddress, setShippingAddress] = useState(profile?.address ?? "");
  const [shippingZipCode, setShippingZipCode] = useState(profile?.zipCode ?? "");
  const [athWizardOpen, setAthWizardOpen] = useState(false);
  const [stripeWizardOpen, setStripeWizardOpen] = useState(false);

  const handleEscapeKey = useCallback(() => {
    if (stripeWizardOpen) {
      setStripeWizardOpen(false);
      return;
    }
    if (athWizardOpen) {
      setAthWizardOpen(false);
      return;
    }
    if (activePolicyModalType) {
      setActivePolicyModalType(null);
    } else {
      onClose();
    }
  }, [activePolicyModalType, athWizardOpen, stripeWizardOpen, onClose]);

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
  const summaryShippingFeeUsd = shopOffersPickup ? null : shopShippingFlatFeeUsd;
  const summaryTotalUsd = subtotal + (summaryShippingFeeUsd ?? 0);

  const canCheckout = Boolean(
    policiesData?.requiredPolicyVersionIds && hasAcceptedRequiredPolicies && !isLoadingPolicies,
  );

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

  const buildCheckoutPayloadWith = useCallback(
    (
      buyer: { fullName: string | null; email: string | null; phone: string | null },
      fulfillment: CheckoutFulfillmentInput,
    ) => {
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

      return {
        shopSlug,
        buyer: {
          fullName: buyer.fullName?.trim() || null,
          email: buyer.email?.trim() || null,
          phone: buyer.phone?.trim() || null,
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
    },
    [hasAcceptedRequiredPolicies, policiesData, shopAcceptsStripe, shopAthMovilPhone, shopSlug],
  );

  const handleStripeCheckout = useCallback(async (payload: CheckoutRequestPayload) => {
    setIsCheckingOut(true);
    setActiveCheckoutMethod("stripe");
    setCheckoutError(null);

    try {
      try {
        await saveCheckoutProfile({
          fullName: payload.buyer.fullName ?? "",
          email: payload.buyer.email ?? "",
          phone: payload.buyer.phone ?? "",
          address:
            payload.fulfillment.method === "shipping"
              ? (payload.fulfillment.shippingAddress ?? "")
              : undefined,
          zipCode:
            payload.fulfillment.method === "shipping"
              ? (payload.fulfillment.shippingZipCode ?? "")
              : undefined,
        });
      } catch (profileError) {
        console.error("No se pudo guardar la info del comprador en su cuenta:", profileError);
      }

      setBuyerFullName(payload.buyer.fullName ?? "");
      setBuyerEmail(payload.buyer.email ?? "");
      setBuyerPhone(payload.buyer.phone ?? "");
      if (payload.fulfillment.method === "shipping") {
        setShippingAddress(payload.fulfillment.shippingAddress ?? "");
        setShippingZipCode(payload.fulfillment.shippingZipCode ?? "");
      }
      const result = await createStripeCheckoutSession(payload);
      window.location.assign(result.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo abrir el pago con tarjeta.";
      setCheckoutError(message);
      if (message.toLowerCase().includes("no autenticado")) {
        router.push("/sign-in?next=/carrito");
      }
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setIsCheckingOut(false);
      setActiveCheckoutMethod(null);
    }
  }, [router]);

  const athCartLines = useMemo(
    () =>
      shopItems.map((item) => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        lineTotalUsd: item.product.priceUsd * item.quantity,
      })),
    [shopItems],
  );

  const handleAthWizardSuccess = useCallback((orderId: string) => {
    setAthWizardOpen(false);
    setCompletedOrderId(orderId);
    setCheckoutPhase("success");
  }, []);

  const handleAthWizardCheckoutError = useCallback(
    (message: string) => {
      if (message.toLowerCase().includes("no autenticado")) {
        router.push("/sign-in?next=/carrito");
      }
    },
    [router],
  );

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

        {checkoutPhase === "success" ? (
          <div className="flex flex-col items-center gap-4 px-5 pb-8 pt-4 text-center">
            <style>{`
              @keyframes ath-circle-in {
                0% { transform: scale(0); opacity: 0; }
                60% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes ath-check-draw {
                0% { stroke-dashoffset: 24; }
                100% { stroke-dashoffset: 0; }
              }
              .ath-success-circle {
                animation: ath-circle-in 0.5s ease-out forwards;
              }
              .ath-success-check {
                stroke-dasharray: 24;
                stroke-dashoffset: 24;
                animation: ath-check-draw 0.4s ease-out 0.35s forwards;
              }
            `}</style>
            <div className="ath-success-circle flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-brand)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-[var(--color-white)]">
                <path
                  className="ath-success-check"
                  d="m5 12 5 5L19 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[var(--color-carbon)]">
              ¡Orden en proceso!
            </h2>

            {completedOrderId ? (
              <p className="rounded-xl bg-[var(--color-gray)] px-3 py-1.5 font-mono text-xs text-[var(--color-carbon)]">
                Orden #{completedOrderId.slice(0, 8).toUpperCase()}
              </p>
            ) : null}

            <p className="text-sm leading-relaxed text-[var(--color-gray-500)]">
              El vendedor fue notificado y verificará tu pago.
              Te llegará un email con actualizaciones.
            </p>

            <button
              type="button"
              onClick={onSuccess}
              className="mt-2 w-full rounded-full bg-[var(--color-carbon)] py-3.5 text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80"
            >
              Ver mis órdenes
            </button>
          </div>
        ) : (
        <div className="space-y-3 px-5 pb-6">
          {/* Payment method — first */}
          <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
            <p className="text-xs font-semibold text-[var(--color-gray-500)]">Método de pago</p>
            <p className="mt-1 text-sm text-[var(--color-carbon)]">
              Elige cómo quieres pagar este pedido.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {shopAcceptsStripe ? (
                <button
                  type="button"
                  disabled={isCheckingOut || !canCheckout}
                  className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-base font-semibold text-[var(--color-white)] shadow-[0_10px_24px_var(--shadow-brand-020)] disabled:opacity-70"
                  onClick={() => {
                    setCheckoutError(null);
                    setStripeWizardOpen(true);
                  }}
                >
                  {isCheckingOut && activeCheckoutMethod === "stripe"
                    ? "Abriendo Stripe..."
                    : "Pagar con tarjeta"}
                </button>
              ) : null}

              {shopAthMovilPhone ? (
                <button
                  type="button"
                  disabled={!canCheckout}
                  className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-[var(--color-carbon)] bg-[var(--color-white)] px-6 py-3.5 text-base font-semibold text-[var(--color-carbon)] disabled:opacity-50"
                  onClick={() => {
                    setCheckoutError(null);
                    setAthWizardOpen(true);
                  }}
                >
                  <AthMovilIcon className="h-5 w-5" />
                  Continuar con ATH Móvil
                </button>
              ) : null}

              {!shopAcceptsStripe && !shopAthMovilPhone ? (
                <p className="text-sm text-[var(--color-danger)]">
                  Esta tienda aún no configuró un método de pago.
                </p>
              ) : null}
            </div>
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
            {shopOffersPickup ? (
              <>
                <div className="mt-2 flex items-center justify-between text-sm text-[var(--color-carbon)]">
                  <span>Recogido en tienda</span>
                  <span className="font-semibold">Gratis</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[var(--color-carbon)]">
                  <span>Envío a domicilio</span>
                  <span className="font-semibold">{formatUsd(shopShippingFlatFeeUsd)}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 flex items-center justify-between text-sm text-[var(--color-carbon)]">
                <span>Envío</span>
                <span className="font-semibold">{formatUsd(shopShippingFlatFeeUsd)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-gray-border)] pt-3 text-base text-[var(--color-carbon)]">
              <span className="font-semibold">
                {shopOffersPickup ? "Total desde" : "Total"}
              </span>
              <span className="font-bold">{formatUsd(summaryTotalUsd)}</span>
            </div>
            {shopOffersPickup ? (
              <p className="mt-3 text-xs text-[var(--color-gray-500)]">
                Al pagar eliges recogido en tienda (sin costo) o envío a domicilio (se suma el monto
                de arriba).
              </p>
            ) : null}
          </div>

          {checkoutError ? (
            <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {checkoutError}
            </p>
          ) : null}
        </div>
        )}
      </div>

      {athWizardOpen && shopAthMovilPhone ? (
        <AthMovilCheckoutWizard
          shopName={shopName}
          shopAthMovilPhone={shopAthMovilPhone}
          fulfillmentDecidedOnSheet={false}
          shopOffersPickup={shopOffersPickup}
          fulfillmentMethod="shipping"
          vendorContact={vendorContact}
          cartLines={athCartLines}
          subtotalUsd={subtotal}
          shopShippingFlatFeeUsd={shopShippingFlatFeeUsd}
          initialFullName={profile?.fullName ?? buyerFullName}
          initialEmail={profile?.email ?? buyerEmail}
          initialPhone={profile?.phone ?? buyerPhone}
          initialShippingAddress={shippingAddress}
          initialShippingZipCode={shippingZipCode}
          buildCheckoutPayload={buildCheckoutPayloadWith}
          onSuccess={handleAthWizardSuccess}
          onCheckoutError={handleAthWizardCheckoutError}
          onClose={() => setAthWizardOpen(false)}
        />
      ) : null}

      {stripeWizardOpen && shopAcceptsStripe ? (
        <StripeCheckoutWizard
          shopOffersPickup={shopOffersPickup}
          subtotalUsd={subtotal}
          shopShippingFlatFeeUsd={shopShippingFlatFeeUsd}
          initialFullName={buyerFullName}
          initialEmail={buyerEmail}
          initialPhone={buyerPhone}
          initialShippingAddress={shippingAddress}
          initialShippingZipCode={shippingZipCode}
          buildCheckoutPayload={buildCheckoutPayloadWith}
          onSubmit={handleStripeCheckout}
          onClose={() => setStripeWizardOpen(false)}
        />
      ) : null}

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
