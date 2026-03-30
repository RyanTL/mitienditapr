"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BackIcon, CheckIcon, CloseIcon } from "@/components/icons";
import {
  createStripeSubscriptionCheckout,
  fetchVendorStatus,
  redeemVendorAccessCode,
  saveVendorOnboardingStep,
  startVendorOnboarding,
  uploadVendorImage,
} from "@/lib/vendor/client";
import { slugifyShopName } from "@/lib/vendor/slug";
import type { VendorStatusResponse } from "@/lib/vendor/types";

/* ── Types ─────────────────────────────────────────── */

type FormState = {
  vendorName: string;
  slug: string;
  description: string;
  logoUrl: string;
  accessCode: string;
};

const EMPTY: FormState = {
  vendorName: "",
  slug: "",
  description: "",
  logoUrl: "",
  accessCode: "",
};

/* ── Helpers ────────────────────────────────────────── */

function hydrate(snap: VendorStatusResponse, prev: FormState): FormState {
  const raw = (snap.onboarding?.data_json as Record<string, unknown> | null)?.["step_1"] as
    | Record<string, unknown>
    | undefined;
  const s = (k: string) => (typeof raw?.[k] === "string" ? (raw[k] as string) : "");
  return {
    ...prev,
    vendorName: s("vendorName") || snap.shop?.vendor_name || snap.profile.full_name || "",
    slug: s("slug") || snap.shop?.slug || "",
    description: s("description") || snap.shop?.description || "",
    logoUrl: s("logoUrl") || snap.shop?.logo_url || "",
  };
}

function done(s: VendorStatusResponse) {
  return (
    s.onboarding?.status === "completed" ||
    s.subscription?.status === "active" ||
    s.subscription?.status === "trialing" ||
    s.billingBypassEnabled
  );
}

/* ── Sub-components ─────────────────────────────────── */

function Bar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-full transition-all duration-500 ease-out ${
            i < step ? "h-[3px] bg-black" : "h-[2px] bg-[#e5e5ea]"
          }`}
        />
      ))}
    </div>
  );
}

function Cam() {
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

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-black border-t-transparent ${className}`}
    />
  );
}

/* ── CSS ────────────────────────────────────────────── */

const CSS = `
@keyframes onb-slide{from{opacity:0;transform:translateX(var(--dx,50px))}to{opacity:1;transform:translateX(0)}}
@keyframes onb-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes onb-hero{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
.onb-in{animation:onb-slide .5s cubic-bezier(.16,1,.3,1) both}
.ob1{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .05s both}
.ob2{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .1s both}
.ob3{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .16s both}
.ob4{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .22s both}
.ob5{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .28s both}
.obh{animation:onb-hero .7s cubic-bezier(.16,1,.3,1) both}
.obh1{animation:onb-hero .7s cubic-bezier(.16,1,.3,1) .08s both}
.obh2{animation:onb-hero .7s cubic-bezier(.16,1,.3,1) .16s both}
`;

/* ── Constants ──────────────────────────────────────── */

const SEGMENTS = 4;
const FEATURES = [
  "Tienda pública en mitienditapr.com",
  "Código QR para compartir",
  "Productos ilimitados",
  "Seguimiento de pedidos en vivo",
];

/* ── Component ──────────────────────────────────────── */

export function VendorOnboardingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  /* state */
  const [, setSnap] = useState<VendorStatusResponse | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(0); // 0 welcome · 1 name · 2 desc · 3 logo · 4 plan
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  /* anim refs */
  const dir = useRef(0);
  const akey = useRef(0);

  function go(t: number) {
    if (t === step) return;
    dir.current = t > step ? 1 : -1;
    akey.current++;
    setError(null);
    setStep(t);
  }

  /* ── effects ── */

  // init
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { snapshot } = await startVendorOnboarding();
        if (!alive) return;
        setSnap(snapshot);
        setForm((f) => hydrate(snapshot, f));
        if (done(snapshot)) {
          router.replace("/vendedor/panel");
          return;
        }
        if ((snapshot.onboarding?.current_step ?? 1) >= 2) setStep(4);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "No se pudo cargar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stripe redirect
  useEffect(() => {
    const sub = params.get("subscription");
    if (!sub) return;
    if (sub === "success" || sub === "already_active") {
      (async () => {
        setSaving(true);
        setInfo("Verificando tu suscripción…");
        try {
          await saveVendorOnboardingStep(2, { subscriptionCheckoutCompleted: true });
          const s = await fetchVendorStatus();
          if (done(s)) {
            router.replace("/vendedor/panel");
            return;
          }
          setInfo("Suscripción activada. Accediendo…");
          setTimeout(() => router.replace("/vendedor/panel"), 1500);
        } catch {
          setStep(4);
          setInfo("Suscripción procesada. Redirigiendo…");
          setTimeout(() => router.replace("/vendedor/panel"), 1500);
        } finally {
          setSaving(false);
        }
      })();
    } else if (sub === "cancel") {
      setStep(4);
      setInfo("Puedes intentarlo de nuevo cuando estés listo.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-slug
  useEffect(() => {
    if (!slugEdited && form.vendorName) {
      setForm((f) => ({ ...f, slug: slugifyShopName(f.vendorName) }));
    }
  }, [form.vendorName, slugEdited]);

  /* ── handlers ── */

  async function saveAndPlan() {
    const name = form.vendorName.trim();
    const slug = form.slug.trim();
    if (!name) {
      setError("El nombre es obligatorio.");
      go(1);
      return;
    }
    if (!slug) {
      setError("La URL es obligatoria.");
      go(1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveVendorOnboardingStep(1, {
        vendorName: name,
        slug,
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim(),
      });
      go(4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar.";
      setError(msg);
      if (/url|slug/i.test(msg)) go(1);
    } finally {
      setSaving(false);
    }
  }

  function next() {
    setError(null);
    if (step === 0) go(1);
    else if (step === 1) {
      if (!form.vendorName.trim()) {
        setError("El nombre es obligatorio.");
        return;
      }
      go(2);
    } else if (step === 2) go(3);
    else if (step === 3) void saveAndPlan();
  }

  function back() {
    if (step > 0) go(step - 1);
    else router.back();
  }

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
    const code = form.accessCode.trim();
    if (!code) {
      setError("Escribe un código de acceso.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await redeemVendorAccessCode(code);
      if (r.alreadyRedeemed) setInfo("Ya tenías este código aplicado.");
      router.replace("/vendedor/panel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código inválido.");
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadVendorImage(file);
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setUploading(false);
    }
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "mitiendita.pr";

  /* ── loading ── */

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  /* ── render ── */

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <style>{CSS}</style>

      {/* header */}
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-center px-6">
        <button
          type="button"
          onClick={back}
          className="absolute left-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-opacity hover:opacity-50 active:opacity-40"
          aria-label={step === 0 ? "Cerrar" : "Volver"}
        >
          {step === 0 ? (
            <CloseIcon className="h-[18px] w-[18px] text-black" />
          ) : (
            <BackIcon className="h-[18px] w-[18px] text-black" />
          )}
        </button>
        {step > 0 && (
          <div className="w-[140px]">
            <Bar step={step} total={SEGMENTS} />
          </div>
        )}
      </header>

      {/* steps */}
      <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
        <div
          key={akey.current}
          className={dir.current !== 0 ? "onb-in" : ""}
          style={
            dir.current !== 0
              ? ({ "--dx": `${dir.current * 50}px` } as React.CSSProperties)
              : undefined
          }
        >
          <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
            {/* ── Welcome ──────────────────────────── */}
            {step === 0 && (
              <>
                <div className="flex flex-1 flex-col justify-end px-7">
                  <h1 className="obh text-[36px] font-bold leading-[1.08] tracking-[-0.04em] text-black">
                    Abre tu
                    <br />
                    tienda
                  </h1>
                  <p className="obh1 mt-4 max-w-[300px] text-[16px] leading-[1.5] text-[#86868b]">
                    Vende en Puerto Rico con tu propia tienda online. Rápido, fácil, sin
                    complicaciones.
                  </p>
                </div>
                <div className="obh2 shrink-0 px-7 pb-12 pt-8">
                  <button
                    type="button"
                    onClick={next}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-transform active:scale-[0.98]"
                  >
                    Comenzar
                  </button>
                </div>
              </>
            )}

            {/* ── Name ─────────────────────────────── */}
            {step === 1 && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    ¿Cómo se llama
                    <br />
                    tu tienda?
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Así aparecerá para tus clientes
                  </p>
                  <div className="ob3 mt-10">
                    <input
                      type="text"
                      value={form.vendorName}
                      onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                      placeholder="Ej. Café La Isla"
                      autoFocus
                      className="w-full border-none bg-transparent text-[24px] font-bold text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                    />
                    <div className="mt-3 flex items-baseline text-[14px] text-[#aeaeb2]">
                      <span>{host}/</span>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => {
                          setSlugEdited(true);
                          setForm((f) => ({ ...f, slug: slugifyShopName(e.target.value) }));
                        }}
                        placeholder="tu-tienda"
                        className="min-w-[60px] flex-1 border-none bg-transparent text-[14px] text-[#aeaeb2] placeholder:text-[#d1d1d6] focus:text-black focus:outline-none"
                      />
                    </div>
                  </div>
                  {error && <p className="ob4 mt-6 text-[14px] text-[#ff3b30]">{error}</p>}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    disabled={!form.vendorName.trim()}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}

            {/* ── Description ──────────────────────── */}
            {step === 2 && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Describe tu
                    <br />
                    negocio
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Opcional &middot; Cuéntale a tus clientes qué ofreces
                  </p>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Vendemos los mejores productos artesanales de PR…"
                    maxLength={280}
                    autoFocus
                    rows={4}
                    className="ob3 mt-8 w-full resize-none border-none bg-transparent text-[18px] leading-relaxed text-black caret-black placeholder:text-[#d1d1d6] focus:outline-none"
                  />
                  <p className="ob3 text-right text-[13px] text-[#c7c7cc]">
                    {form.description.length}/280
                  </p>
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

            {/* ── Logo ─────────────────────────────── */}
            {step === 3 && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Logo de
                    <br />
                    tu tienda
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Opcional &middot; PNG, JPG o WebP
                  </p>
                  <div className="ob3 mt-10 flex flex-col items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-[#e5e5ea] transition-all hover:border-[#c7c7cc] active:scale-[0.97]"
                    >
                      {form.logoUrl ? (
                        <Image src={form.logoUrl} alt="Logo" fill className="object-cover" />
                      ) : uploading ? (
                        <Spinner />
                      ) : (
                        <div className="flex flex-col items-center gap-2.5">
                          <Cam />
                          <span className="text-[13px] text-[#aeaeb2]">Toca para subir</span>
                        </div>
                      )}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.currentTarget.files?.[0];
                        if (f) void upload(f);
                      }}
                    />
                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                        className="text-[14px] text-[#aeaeb2] underline decoration-[#d1d1d6] underline-offset-2"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  {error && (
                    <p className="mt-4 text-center text-[14px] text-[#ff3b30]">{error}</p>
                  )}
                </div>
                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    onClick={next}
                    disabled={saving || uploading}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    {saving ? "Guardando…" : "Continuar"}
                  </button>
                </div>
              </>
            )}

            {/* ── Plan ─────────────────────────────── */}
            {step === 4 && (
              <>
                <div className="flex flex-1 flex-col px-7 pt-4 pb-4">
                  <h1 className="ob1 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-black">
                    Activa tu
                    <br />
                    tienda
                  </h1>
                  <p className="ob2 mt-2.5 text-[15px] text-[#86868b]">
                    Suscríbete para comenzar a vender
                  </p>

                  {/* preview */}
                  <div className="ob3 mt-8 flex items-center gap-3.5">
                    {form.logoUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                        <Image src={form.logoUrl} alt="" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7]">
                        <span className="text-[18px] font-bold text-[#aeaeb2]">
                          {(form.vendorName || "T")[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-black">
                        {form.vendorName}
                      </p>
                      <p className="truncate text-[13px] text-[#aeaeb2]">
                        {host}/{form.slug}
                      </p>
                    </div>
                  </div>

                  {/* plan card */}
                  <div className="ob4 mt-6 rounded-2xl border border-[#e5e5ea] p-5">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[15px] font-semibold text-black">Plan Vendedor</p>
                      <div>
                        <span className="text-[32px] font-bold tracking-tight text-black">
                          $10
                        </span>
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
                  </div>

                  {/* access code */}
                  <div className="ob5 mt-5">
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
                          value={form.accessCode}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, accessCode: e.target.value }))
                          }
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

                  {info && <p className="mt-4 text-[14px] text-[#007aff]">{info}</p>}
                  {error && <p className="mt-4 text-[14px] text-[#ff3b30]">{error}</p>}
                </div>

                <div className="shrink-0 px-7 pb-12 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void subscribe()}
                    className="w-full rounded-full bg-black py-[18px] text-[16px] font-semibold text-white transition-all active:scale-[0.98] disabled:bg-[#d1d1d6]"
                  >
                    {saving ? "Cargando…" : "Suscribirme por $10/mes"}
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
