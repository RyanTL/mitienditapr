"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { BackIcon } from "@/components/icons";
import { ShopContactChips } from "@/components/shop/shop-contact-chips";
import {
  ONBOARDING_STEP_ANIMATIONS_CSS,
  OnboardingSegmentedBar,
} from "@/components/onboarding/onboarding-step-primitives";
import { formatPhoneForDisplay, formatUsd } from "@/lib/formatters";
import { computePuertoRicoIvuUsd } from "@/lib/tax/puerto-rico-ivu";
import type { VendorContactInfo } from "@/lib/supabase/shop-types";
import { saveCheckoutProfile } from "@/lib/account/client";
import {
  createAthMovilCheckout,
  type CheckoutFulfillmentInput,
  type CheckoutRequestPayload,
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

function ReceiptCamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-[#c7c7cc]">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export type AthMovilCheckoutWizardLine = {
  id: string;
  name: string;
  quantity: number;
  lineTotalUsd: number;
};

export type { VendorContactInfo } from "@/lib/supabase/shop-types";

type AthMovilCheckoutWizardProps = {
  shopName: string;
  shopAthMovilPhone: string;
  /** When true, `fulfillmentMethod` comes from the checkout sheet; otherwise the wizard collects it. */
  fulfillmentDecidedOnSheet: boolean;
  shopOffersPickup: boolean;
  fulfillmentMethod: "shipping" | "pickup";
  vendorContact: VendorContactInfo;
  cartLines: AthMovilCheckoutWizardLine[];
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
  onSuccess: (orderId: string) => void;
  onCheckoutError: (message: string) => void;
  onClose: () => void;
};

export function AthMovilCheckoutWizard({
  shopName,
  shopAthMovilPhone,
  fulfillmentDecidedOnSheet,
  shopOffersPickup,
  fulfillmentMethod,
  vendorContact,
  cartLines,
  subtotalUsd,
  shopShippingFlatFeeUsd,
  initialFullName,
  initialEmail,
  initialPhone,
  initialShippingAddress,
  initialShippingZipCode,
  buildCheckoutPayload,
  onSuccess,
  onCheckoutError,
  onClose,
}: AthMovilCheckoutWizardProps) {
  const { first: initialFirst, last: initialLast } = splitFullName(initialFullName);
  const [wizardFulfillment, setWizardFulfillment] = useState(fulfillmentMethod);
  const effectiveFulfillment = fulfillmentDecidedOnSheet ? fulfillmentMethod : wizardFulfillment;

  const includeDeliveryStep = !fulfillmentDecidedOnSheet && shopOffersPickup;
  const needsAddressStep = effectiveFulfillment === "shipping";
  const totalSteps =
    (includeDeliveryStep ? 1 : 0) + 3 + (needsAddressStep ? 1 : 0) + 1;
  const sDelivery = includeDeliveryStep ? 1 : 0;
  const sName = sDelivery + 1;
  const sEmail = sName + 1;
  const sPhone = sEmail + 1;
  const sAddress = needsAddressStep ? sPhone + 1 : 0;
  const sPay = needsAddressStep ? sAddress + 1 : sPhone + 1;

  const shippingFeeUsd = useMemo(
    () => (effectiveFulfillment === "shipping" ? shopShippingFlatFeeUsd : 0),
    [effectiveFulfillment, shopShippingFlatFeeUsd],
  );
  const { taxUsd, totalUsd } = useMemo(
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptNote, setReceiptNote] = useState("");

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const dir = useRef(0);
  const akey = useRef(0);

  const go = useCallback((t: number) => {
    if (t === step) return;
    dir.current = t > step ? 1 : -1;
    akey.current += 1;
    setError(null);
    setStep(t);
  }, [step]);

  const fullNameForPayload = `${firstName.trim()} ${lastName.trim()}`.trim() || null;

  const buildFulfillmentFromWizard = useCallback((): CheckoutFulfillmentInput => {
    if (effectiveFulfillment === "pickup") {
      return { method: "pickup", pickupNotes: null };
    }
    return {
      method: "shipping",
      shippingAddress: shippingAddress.trim(),
      shippingZipCode: shippingZipCode.trim(),
    };
  }, [effectiveFulfillment, shippingAddress, shippingZipCode]);

  function nextFromAddressStep() {
    setError(null);
    if (effectiveFulfillment === "shipping") {
      if (!shippingAddress.trim()) {
        setError("La dirección es obligatoria.");
        return;
      }
      if (!/^\d{5}$/.test(shippingZipCode.trim())) {
        setError("Escribe un código postal válido de 5 dígitos.");
        return;
      }
    }
    go(sPay);
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
        go(sPay);
      }
    } else if (step === sAddress) {
      nextFromAddressStep();
    }
  }

  function back() {
    if (step <= 1) {
      onClose();
    } else {
      go(step - 1);
    }
  }

  async function submit() {
    if (!receiptFile) {
      setError("Debes subir el recibo de ATH Móvil.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fulfillment = buildFulfillmentFromWizard();
      const payload = buildCheckoutPayload(
        {
          fullName: fullNameForPayload,
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
        fulfillment,
      );
      try {
        await saveCheckoutProfile({
          fullName: fullNameForPayload,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address:
            payload.fulfillment.method === "shipping"
              ? (payload.fulfillment.shippingAddress ?? null)
              : undefined,
          zipCode:
            payload.fulfillment.method === "shipping"
              ? (payload.fulfillment.shippingZipCode ?? null)
              : undefined,
        });
      } catch (profileError) {
        console.error("No se pudo guardar la info del comprador en su cuenta:", profileError);
      }
      const result = await createAthMovilCheckout({
        payload,
        receipt: receiptFile,
        receiptNote: receiptNote.trim() || null,
      });
      onSuccess(result.orderId);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se pudo completar la orden.";
      onCheckoutError(message);
      setError(message);
    } finally {
      setSubmitting(false);
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
                      onClick={() => setWizardFulfillment("shipping")}
                      className={[
                        "w-full rounded-full py-[18px] text-[16px] font-semibold transition-all active:scale-[0.98]",
                        wizardFulfillment === "shipping"
                          ? "bg-black text-white"
                          : "border border-[#e5e5ea] bg-white text-black",
                      ].join(" ")}
                    >
                      Envío
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardFulfillment("pickup")}
                      className={[
                        "w-full rounded-full py-[18px] text-[16px] font-semibold transition-all active:scale-[0.98]",
                        wizardFulfillment === "pickup"
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
                    disabled={!phone.trim()}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {step === sAddress && effectiveFulfillment === "shipping" && (
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
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-transform active:scale-[0.98]"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {step === sPay && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4 pb-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Resumen y
                    <br />
                    pago ATH
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Envía el monto a la tienda y sube el recibo
                  </p>

                  <div className="ob3 mt-6 space-y-2 rounded-2xl bg-[#f5f5f7] px-4 py-3">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[#86868b]">
                      {shopName}
                    </p>
                    {cartLines.map((line) => (
                      <div
                        key={line.id}
                        className="flex justify-between gap-2 text-[15px] text-black"
                      >
                        <span className="min-w-0 truncate">
                          {line.name} × {line.quantity}
                        </span>
                        <span className="shrink-0 font-semibold">
                          {formatUsd(line.lineTotalUsd)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-[#e5e5ea] pt-2 text-[15px] text-black">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-semibold">{formatUsd(subtotalUsd)}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>
                          {effectiveFulfillment === "shipping"
                            ? "Envío a domicilio"
                            : "Recogido en tienda"}
                        </span>
                        <span className="font-semibold">
                          {effectiveFulfillment === "shipping"
                            ? formatUsd(shippingFeeUsd)
                            : "Gratis"}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>IVU (11.5%)</span>
                        <span className="font-semibold">{formatUsd(taxUsd)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-[17px] font-bold">
                        <span>Total</span>
                        <span>{formatUsd(totalUsd)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ob3 mt-6 rounded-2xl border-2 border-black px-4 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
                      Número ATH Móvil
                    </p>
                    <p className="mt-1 font-mono text-[22px] font-bold tracking-tight text-black">
                      {formatPhoneForDisplay(shopAthMovilPhone)}
                    </p>
                  </div>

                  <ol className="ob3 mt-5 space-y-2.5 text-[14px] leading-snug text-[#3a3a3c]">
                    <li>
                      <span className="font-semibold text-black">1.</span> Contacta al vendedor
                      para{" "}
                      {effectiveFulfillment === "pickup" ? "recogido" : "coordinar envío"}.
                    </li>
                    <li>
                      <span className="font-semibold text-black">2.</span> Abre ATH Móvil.
                    </li>
                    <li>
                      <span className="font-semibold text-black">3.</span> Envía{" "}
                      <strong>{formatUsd(totalUsd)}</strong> al número de arriba.
                    </li>
                    <li>
                      <span className="font-semibold text-black">4.</span> Captura el recibo y
                      súbelo abajo.
                    </li>
                  </ol>

                  <ShopContactChips contact={vendorContact} className="ob3 mt-4" />

                  <div className="ob4 mt-8 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => receiptInputRef.current?.click()}
                      className="relative flex h-[11rem] w-full max-w-[11rem] items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-[#e5e5ea] transition-all hover:border-[#c7c7cc] active:scale-[0.97]"
                    >
                      {receiptPreviewUrl ? (
                        <Image
                          src={receiptPreviewUrl}
                          alt="Recibo subido"
                          fill
                          sizes="11rem"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2.5">
                          <ReceiptCamIcon />
                          <span className="text-[13px] text-[#aeaeb2]">Toca para subir recibo</span>
                        </div>
                      )}
                    </button>
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.currentTarget.files?.[0];
                        setReceiptFile(f ?? null);
                      }}
                    />
                    {receiptFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptFile(null);
                          if (receiptInputRef.current) receiptInputRef.current.value = "";
                        }}
                        className="text-[14px] text-[#aeaeb2] underline decoration-[#d1d1d6] underline-offset-2"
                      >
                        Quitar archivo
                      </button>
                    ) : null}
                  </div>

                  <textarea
                    value={receiptNote}
                    onChange={(e) => setReceiptNote(e.target.value)}
                    placeholder="Nota opcional para la tienda"
                    rows={2}
                    className="ob4 mt-4 w-full resize-none border-none bg-transparent text-[16px] leading-relaxed text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                  />

                  {error && (
                    <p className="mt-4 text-center text-[14px] text-[#ff3b30]">{error}</p>
                  )}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={submitting || !receiptFile}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    {submitting ? "Enviando…" : "Enviar comprobante"}
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
