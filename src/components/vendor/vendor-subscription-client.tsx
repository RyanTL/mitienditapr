"use client";

import { useState } from "react";

import { CheckIcon } from "@/components/icons";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  createStripeSubscriptionCheckout,
  redeemVendorAccessCode,
} from "@/lib/vendor/client";

const FEATURES = [
  "Productos ilimitados",
  "Tienda pública en mitienditapr.com",
  "Código QR para compartir",
  "Seguimiento de pedidos en vivo",
];

export function VendorSubscriptionClient() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  async function subscribe() {
    setSaving(true);
    setError(null);
    try {
      const res = await createStripeSubscriptionCheckout();
      window.location.assign(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el pago.");
      setSaving(false);
    }
  }

  async function redeem() {
    const code = accessCode.trim();
    if (!code) {
      setError("Escribe un código de acceso.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await redeemVendorAccessCode(code);
      window.location.assign("/vendedor/panel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código inválido.");
      setSaving(false);
    }
  }

  return (
    <VendorPageShell title="Suscripción">
      <div className="mx-auto max-w-md space-y-6">
        {/* Current plan */}
        <div className="rounded-2xl border border-[#e5e5ea] bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--color-gray-100)] px-3 py-1 text-xs font-semibold text-[var(--color-gray-500)]">
              Plan actual
            </span>
            <span className="text-sm text-[var(--color-gray-500)]">Gratuito</span>
          </div>
          <p className="mt-3 text-sm text-[var(--color-gray-500)]">
            Hasta 4 productos. Perfecto para probar la plataforma.
          </p>
        </div>

        {/* Pro plan card */}
        <div className="rounded-2xl border-2 border-black bg-white p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-semibold text-black">Plan Vendedor</p>
            <div>
              <span className="text-[32px] font-bold tracking-tight text-black">$10</span>
              <span className="ml-0.5 text-[14px] text-[#aeaeb2]">/mes</span>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {FEATURES.map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-black">
                  <CheckIcon className="h-2.5 w-2.5 text-white" />
                </span>
                <span className="text-[14px] text-[#3c3c43]">{feat}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-[#aeaeb2]">Cancela cuando quieras</p>

          <button
            type="button"
            disabled={saving}
            onClick={() => void subscribe()}
            className="mt-5 w-full rounded-full bg-black py-[16px] text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
          >
            {saving ? "Cargando…" : "Suscribirme por $10/mes"}
          </button>
        </div>

        {/* Access code */}
        <div>
          <button
            type="button"
            onClick={() => setCodeOpen((v) => !v)}
            className="text-[14px] text-[#aeaeb2] underline decoration-[#d1d1d6] underline-offset-2"
          >
            ¿Tienes un código de acceso?
          </button>
          {codeOpen && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void redeem();
                }}
                placeholder="CODIGO123"
                className="flex-1 rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3 text-[14px] text-black placeholder:text-[#d1d1d6] focus:border-black focus:outline-none"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void redeem()}
                className="shrink-0 rounded-xl border border-black px-5 py-3 text-[14px] font-semibold text-black transition-opacity hover:opacity-60 disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-[14px] text-[#ff3b30]">{error}</p>}
      </div>
    </VendorPageShell>
  );
}
