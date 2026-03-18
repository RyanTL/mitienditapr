"use client";

import Link from "next/link";
import { useState } from "react";

import { AthMovilIcon, CloseIcon } from "@/components/icons";
import { formatUsd } from "@/lib/formatters";

type AthMovilCheckoutSheetProps = {
  shopSlug: string;
  shopName: string;
  athMovilPhone: string;
  totalUsd: number;
  isOpen: boolean;
  onClose: () => void;
};

type CheckoutState = "idle" | "confirming" | "success" | "error";

export function AthMovilCheckoutSheet({
  shopSlug,
  shopName,
  athMovilPhone,
  totalUsd,
  isOpen,
  onClose,
}: AthMovilCheckoutSheetProps) {
  const [state, setState] = useState<CheckoutState>("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    setState("confirming");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/checkout/ath-movil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        orderId?: string;
        error?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "No se pudo crear la orden.");
      }

      setOrderId(body.orderId ?? null);
      setState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Ocurrió un error. Intenta de nuevo.",
      );
      setState("error");
    }
  }

  function handleRetry() {
    setState("idle");
    setErrorMessage(null);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-055)]"
        onClick={onClose}
        aria-label="Cerrar"
      />

      {/* Sheet */}
      <div className="relative mx-auto w-full max-w-md rounded-t-3xl bg-[var(--color-white)] p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:rounded-3xl">
        {/* Close button */}
        <button
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        {state === "idle" || state === "confirming" ? (
          <>
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-carbon)]">
                <AthMovilIcon className="h-6 w-6 text-[var(--color-white)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight text-[var(--color-carbon)]">
                  Pagar con ATH Móvil
                </h2>
                <p className="text-sm text-[var(--color-gray-500)]">{shopName}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6 rounded-2xl bg-[var(--color-gray)] px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gray-500)]">
                Total a pagar
              </p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight text-[var(--color-carbon)]">
                {formatUsd(totalUsd)}
              </p>
            </div>

            {/* Instructions */}
            <ol className="mb-6 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-xs font-bold text-[var(--color-white)]">
                  1
                </span>
                <p className="text-sm leading-relaxed text-[var(--color-carbon)]">
                  Abre tu app de <strong>ATH Móvil</strong>
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-xs font-bold text-[var(--color-white)]">
                  2
                </span>
                <p className="text-sm leading-relaxed text-[var(--color-carbon)]">
                  Envía{" "}
                  <strong>{formatUsd(totalUsd)}</strong> al número{" "}
                  <span className="font-mono font-bold">{athMovilPhone}</span>
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-xs font-bold text-[var(--color-white)]">
                  3
                </span>
                <p className="text-sm leading-relaxed text-[var(--color-carbon)]">
                  Regresa aquí y presiona <strong>"Ya envié el pago"</strong>
                </p>
              </li>
            </ol>

            <button
              type="button"
              disabled={state === "confirming"}
              onClick={() => void handleConfirm()}
              className="w-full rounded-full bg-[var(--color-carbon)] py-3.5 text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80 disabled:opacity-60"
            >
              {state === "confirming" ? "Procesando..." : "Ya envié el pago"}
            </button>

            <p className="mt-3 text-center text-[11px] leading-4 text-[var(--color-gray-500)]">
              Al confirmar, estás notificando al vendedor que realizaste el pago.
              El vendedor verificará el recibo antes de despachar tu orden.
            </p>
          </>
        ) : state === "success" ? (
          <>
            <div className="mb-6 flex flex-col items-center gap-3 pt-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand)]">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[var(--color-white)]">
                  <path d="m5 12 5 5L19 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-carbon)]">¡Orden enviada!</h2>
              <p className="text-sm text-[var(--color-gray-500)]">
                El vendedor fue notificado y verificará tu pago pronto.
              </p>
              {orderId ? (
                <p className="rounded-xl bg-[var(--color-gray)] px-3 py-1.5 font-mono text-xs text-[var(--color-carbon)]">
                  Orden #{orderId.slice(0, 8).toUpperCase()}
                </p>
              ) : null}
            </div>

            <Link
              href="/ordenes"
              className="block w-full rounded-full bg-[var(--color-carbon)] py-3.5 text-center text-sm font-semibold text-[var(--color-white)]"
              onClick={onClose}
            >
              Ver mis órdenes
            </Link>
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center gap-3 pt-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger)]">
                <CloseIcon className="h-8 w-8 text-[var(--color-white)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-carbon)]">Ocurrió un error</h2>
              <p className="text-sm text-[var(--color-danger)]">
                {errorMessage ?? "No se pudo procesar tu orden."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              className="w-full rounded-full bg-[var(--color-carbon)] py-3.5 text-sm font-semibold text-[var(--color-white)]"
            >
              Intentar de nuevo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
