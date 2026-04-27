"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { BackIcon } from "@/components/icons";
import {
  ONBOARDING_STEP_ANIMATIONS_CSS,
  OnboardingSegmentedBar,
} from "@/components/onboarding/onboarding-step-primitives";
import { formatUsd } from "@/lib/formatters";
import { computePuertoRicoIvuUsd } from "@/lib/tax/puerto-rico-ivu";
import type {
  CheckoutFulfillmentInput,
  CheckoutRequestPayload,
} from "@/lib/orders/client";

function splitFullName(fullName: string): { first: string; last: string } {
  const t = fullName.trim();
  if (!t) return { first: "", last: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { first: t, last: "" };
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
}

function isValidEmail(value: string) {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type StripeCheckoutWizardProps = {
  shopOffersPickup: boolean;
  subtotalUsd: number;
  shopShippingFlatFeeUsd: number;
  initialFullName: string;
  initialEmail: string;
  initialPhone: string;
  initialShippingAddress: string;
  initialShippingZipCode: string;
  buildCheckoutPayload: (
    buyer: { fullName: string | null; email: string | null; phone: string | null },
    fulfillment: CheckoutFulfillmentInput,
  ) => CheckoutRequestPayload;
  onSubmit: (payload: CheckoutRequestPayload) => Promise<void> | void;
  onClose: () => void;
};

export function StripeCheckoutWizard({
  shopOffersPickup,
  subtotalUsd,
  shopShippingFlatFeeUsd,
  initialFullName,
  initialEmail,
  initialPhone,
  initialShippingAddress,
  initialShippingZipCode,
  buildCheckoutPayload,
  onSubmit,
  onClose,
}: StripeCheckoutWizardProps) {
  const { first: initialFirst, last: initialLast } = splitFullName(initialFullName);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"shipping" | "pickup">("shipping");

  const includeDeliveryStep = shopOffersPickup;
  const needsAddressStep = fulfillmentMethod === "shipping";
  const totalSteps =
    (includeDeliveryStep ? 1 : 0) + 3 + (needsAddressStep ? 1 : 0);
  const sDelivery = includeDeliveryStep ? 1 : 0;
  const sName = sDelivery + 1;
  const sEmail = sName + 1;
  const sPhone = sEmail + 1;
  const sAddress = needsAddressStep ? sPhone + 1 : 0;
  const sSubmit = needsAddressStep ? sAddress : sPhone;

  const shippingFeeUsd = useMemo(
    () => (fulfillmentMethod === "shipping" ? shopShippingFlatFeeUsd : 0),
    [fulfillmentMethod, shopShippingFlatFeeUsd],
  );
  const { totalUsd } = useMemo(
    () =>
      computePuertoRicoIvuUsd({
        subtotalUsd,
        shippingFeeUsd,
      }),
    [subtotalUsd, shippingFeeUsd],
  );

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
  const [shippingZipCode, setShippingZipCode] = useState(initialShippingZipCode);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dir = useRef(0);
  const akey = useRef(0);

  const go = useCallback(
    (t: number) => {
      if (t === step) return;
      dir.current = t > step ? 1 : -1;
      akey.current += 1;
      setError(null);
      setStep(t);
    },
    [step],
  );

  async function doSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || null;
      const fulfillment: CheckoutFulfillmentInput =
        fulfillmentMethod === "pickup"
          ? { method: "pickup", pickupNotes: null }
          : {
              method: "shipping",
              shippingAddress: shippingAddress.trim(),
              shippingZipCode: shippingZipCode.trim(),
            };

      const payload = buildCheckoutPayload(
        { fullName, email: email.trim() || null, phone: phone.trim() || null },
        fulfillment,
      );
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo continuar.");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setError(null);
    if (sDelivery && step === sDelivery) {
      go(sName);
      return;
    }
    if (step === sName) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Nombre y apellido son obligatorios.");
        return;
      }
      go(sEmail);
    } else if (step === sEmail) {
      if (!email.trim() || !isValidEmail(email)) {
        setError("Escribe un correo válido.");
        return;
      }
      go(sPhone);
    } else if (step === sPhone) {
      if (!phone.trim()) {
        setError("El teléfono es obligatorio.");
        return;
      }
      if (needsAddressStep) {
        go(sAddress);
      } else {
        void doSubmit();
      }
    } else if (step === sAddress) {
      if (!shippingAddress.trim()) {
        setError("La dirección es obligatoria.");
        return;
      }
      if (!/^\d{5}$/.test(shippingZipCode.trim())) {
        setError("Escribe un código postal válido de 5 dígitos.");
        return;
      }
      void doSubmit();
    }
  }

  function back() {
    if (step <= 1) {
      onClose();
    } else {
      // Skip address step when going back if pickup
      if (step === sSubmit + 1 && !needsAddressStep) {
        go(sPhone);
      } else {
        go(step - 1);
      }
    }
  }

  const inputClass =
    "w-full border-none bg-transparent text-[24px] font-bold text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none";
  const inputClassSecondary =
    "mt-6 w-full border-none bg-transparent text-[20px] font-semibold text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      <style>{ONBOARDING_STEP_ANIMATIONS_CSS}</style>

      <header className="relative z-10 flex h-14 shrink-0 items-center justify-center px-6">
        <button
          type="button"
          onClick={back}
          className="absolute left-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity hover:opacity-50 active:opacity-40"
          aria-label="Volver"
        >
          <BackIcon className="h-[18px] w-[18px] text-black" />
        </button>
        <div className="w-[200px]">
          <OnboardingSegmentedBar step={step} total={totalSteps} />
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
        <div
          key={akey.current}
          className={dir.current !== 0 ? "onb-in" : ""}
          style={
            dir.current !== 0
              ? ({ "--dx": `${dir.current * 50}px` } as CSSProperties)
              : undefined
          }
        >
          <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
            {sDelivery > 0 && step === sDelivery && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    ¿Cómo quieres
                    <br />
                    recibirlo?
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Elige envío a tu dirección o recogido en la tienda
                  </p>
                  <div className="ob3 mt-10 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("shipping")}
                      className={[
                        "w-full rounded-full py-[18px] text-[16px] font-semibold transition-all active:scale-[0.98]",
                        fulfillmentMethod === "shipping"
                          ? "bg-black text-white"
                          : "border border-[#e5e5ea] bg-white text-black",
                      ].join(" ")}
                    >
                      Envío
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("pickup")}
                      className={[
                        "w-full rounded-full py-[18px] text-[16px] font-semibold transition-all active:scale-[0.98]",
                        fulfillmentMethod === "pickup"
                          ? "bg-black text-white"
                          : "border border-[#e5e5ea] bg-white text-black",
                      ].join(" ")}
                    >
                      Recogido
                    </button>
                  </div>
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-transform active:scale-[0.98]"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {step === sName && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    ¿Cómo te
                    <br />
                    llamas?
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Así verá la tienda quién hizo el pedido
                  </p>
                  <div className="ob3 mt-10 flex flex-col gap-6">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                      placeholder="Nombre"
                      autoFocus
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                      placeholder="Apellido"
                      className={inputClassSecondary}
                    />
                  </div>
                  {error && <p className="ob4 mt-6 text-[14px] text-[#ff3b30]">{error}</p>}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    disabled={!firstName.trim() || !lastName.trim()}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {step === sEmail && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Tu correo
                    <br />
                    electrónico
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Para confirmación y actualizaciones del pedido
                  </p>
                  <div className="ob3 mt-10">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                      placeholder="correo@ejemplo.com"
                      autoFocus
                      autoComplete="email"
                      className="w-full border-none bg-transparent text-[22px] font-semibold text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                    />
                  </div>
                  {error && <p className="ob4 mt-6 text-[14px] text-[#ff3b30]">{error}</p>}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    disabled={!email.trim() || !isValidEmail(email)}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {step === sPhone && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Tu número
                    <br />
                    de teléfono
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Por si la tienda necesita contactarte
                  </p>
                  <div className="ob3 mt-10">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                      placeholder="Ej. 787-000-0000"
                      autoFocus
                      autoComplete="tel"
                      className="w-full border-none bg-transparent text-[24px] font-bold text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                    />
                  </div>
                  {error && <p className="ob4 mt-6 text-[14px] text-[#ff3b30]">{error}</p>}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    disabled={!phone.trim() || submitting}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    {!needsAddressStep
                      ? submitting
                        ? "Abriendo Stripe..."
                        : `Pagar ${formatUsd(totalUsd)}`
                      : "Siguiente"}
                  </button>
                </div>
              </>
            )}

            {needsAddressStep && step === sAddress && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Dirección
                    <br />
                    de envío
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    A dónde enviaremos tu pedido
                  </p>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Calle, número, urbanización…"
                    autoFocus
                    rows={4}
                    className="ob3 mt-8 w-full resize-none border-none bg-transparent text-[18px] leading-relaxed text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={shippingZipCode}
                    onChange={(e) =>
                      setShippingZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))
                    }
                    placeholder="Código postal (5 dígitos)"
                    className="ob3 mt-6 w-full border-none bg-transparent text-[20px] font-semibold text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                  />
                  {error && <p className="ob4 mt-6 text-[14px] text-[#ff3b30]">{error}</p>}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    disabled={submitting}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    {submitting ? "Abriendo Stripe..." : `Pagar ${formatUsd(totalUsd)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
