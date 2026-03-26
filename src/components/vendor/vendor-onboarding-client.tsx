"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CheckIcon } from "@/components/icons";
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

type FormState = {
  vendorName: string;
  slug: string;
  description: string;
  logoUrl: string;
  accessCode: string;
};

const DEFAULT_FORM: FormState = {
  vendorName: "",
  slug: "",
  description: "",
  logoUrl: "",
  accessCode: "",
};

function hydrateForm(snapshot: VendorStatusResponse, current: FormState): FormState {
  const step1 = (snapshot.onboarding?.data_json as Record<string, unknown> | null)?.[
    "step_1"
  ] as Record<string, unknown> | null;

  const getString = (src: Record<string, unknown> | null, key: string, fb = "") => {
    const v = src?.[key];
    return typeof v === "string" ? v : fb;
  };

  return {
    ...current,
    vendorName:
      getString(step1, "vendorName") ||
      snapshot.shop?.vendor_name ||
      snapshot.profile.full_name ||
      "",
    slug: getString(step1, "slug") || snapshot.shop?.slug || "",
    description: getString(step1, "description") || snapshot.shop?.description || "",
    logoUrl: getString(step1, "logoUrl") || snapshot.shop?.logo_url || "",
  };
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            "h-2 rounded-full transition-all",
            i + 1 === current
              ? "w-6 bg-[var(--color-brand)]"
              : i + 1 < current
                ? "w-2 bg-[var(--color-brand)] opacity-40"
                : "w-2 bg-[var(--color-gray-300,#d1d5db)]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function CameraPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[var(--color-gray-500)]">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function VendorOnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<VendorStatusResponse | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const isOnboardingComplete = useCallback((s: VendorStatusResponse) => {
    return (
      s.onboarding?.status === "completed" ||
      s.subscription?.status === "active" ||
      s.subscription?.status === "trialing" ||
      s.billingBypassEnabled
    );
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const res = await startVendorOnboarding();
        if (!mounted) return;

        const snap = res.snapshot;
        setStatus(snap);
        setForm((f) => hydrateForm(snap, f));

        if (isOnboardingComplete(snap)) {
          router.replace("/vendedor/panel");
          return;
        }

        const step = Math.min(Math.max(snap.onboarding?.current_step ?? 1, 1), 2);
        setCurrentStep(step);
      } catch (e) {
        if (mounted) setFormError(e instanceof Error ? e.message : "No se pudo cargar.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Stripe redirect query params (run once on mount)
  useEffect(() => {
    const sub = searchParams.get("subscription");
    if (!sub) return;

    if (sub === "success" || sub === "already_active") {
      void (async () => {
        setIsSaving(true);
        setInfoMsg("Verificando tu suscripción…");
        try {
          await saveVendorOnboardingStep(2, { subscriptionCheckoutCompleted: true });
          const snap = await fetchVendorStatus();
          if (isOnboardingComplete(snap)) {
            router.replace("/vendedor/panel");
            return;
          }
          // Webhook may lag — redirect anyway after brief delay
          setInfoMsg("Suscripción activada. Accediendo a tu panel…");
          setTimeout(() => router.replace("/vendedor/panel"), 1500);
        } catch {
          setCurrentStep(2);
          setInfoMsg("Suscripción procesada. Redirigiendo…");
          setTimeout(() => router.replace("/vendedor/panel"), 1500);
        } finally {
          setIsSaving(false);
        }
      })();
    } else if (sub === "cancel") {
      setCurrentStep(2);
      setInfoMsg("Puedes intentarlo de nuevo cuando estés listo.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate slug from vendor name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited && form.vendorName) {
      const generated = slugifyShopName(form.vendorName);
      setForm((f) => ({ ...f, slug: generated }));
    }
  }, [form.vendorName, slugManuallyEdited]);

  const handleLogoUpload = useCallback(async (file: File) => {
    setIsUploadingLogo(true);
    setFormError(null);
    try {
      const result = await uploadVendorImage(file);
      setForm((f) => ({ ...f, logoUrl: result.url }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo subir el logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }, []);

  const handleSaveStep1 = useCallback(async () => {
    const vendorName = form.vendorName.trim();
    if (!vendorName) {
      setFormError("El nombre de tu tienda es obligatorio.");
      return;
    }
    const slug = form.slug.trim();
    if (!slug) {
      setFormError("La URL de tu tienda es obligatoria.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await saveVendorOnboardingStep(1, {
        vendorName,
        slug,
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim(),
      });
      setCurrentStep(2);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

  const handleStartSubscription = useCallback(async () => {
    setIsSaving(true);
    setFormError(null);
    try {
      const res = await createStripeSubscriptionCheckout();
      window.location.assign(res.url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo abrir el pago.");
      setIsSaving(false);
    }
  }, []);

  const handleRedeemCode = useCallback(async () => {
    const code = form.accessCode.trim();
    if (!code) {
      setFormError("Escribe un código de acceso.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const result = await redeemVendorAccessCode(code);
      if (result.alreadyRedeemed) {
        setInfoMsg("Este código ya estaba aplicado a tu cuenta.");
      }
      router.replace("/vendedor/panel");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Código inválido o ya utilizado.");
      setIsSaving(false);
    }
  }, [form.accessCode, router]);

  const appHost =
    typeof window !== "undefined" ? window.location.hostname : "mitiendita.pr";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-gray-100)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
          <p className="text-sm text-[var(--color-gray-500)]">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-gray-100)]">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-bold text-[var(--color-carbon)]">Mitiendita</span>
        <StepDots current={currentStep} total={2} />
      </header>

      <div className="flex flex-1 flex-col items-center px-4 pb-12">
        <div className="w-full max-w-md space-y-4">

          {/* ── STEP 1: Tu tienda ── */}
          {currentStep === 1 && (
            <>
              <div className="mt-2">
                <h1 className="text-2xl font-bold text-[var(--color-carbon)]">Tu tienda</h1>
                <p className="mt-1 text-sm text-[var(--color-gray-500)]">
                  Cuéntanos un poco sobre tu negocio.
                </p>
              </div>

              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-gray-200)] transition hover:bg-[var(--color-gray)]"
                  aria-label="Subir logo"
                >
                  {form.logoUrl ? (
                    <Image src={form.logoUrl} alt="Logo" fill className="object-cover" />
                  ) : isUploadingLogo ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
                  ) : (
                    <CameraPlaceholder />
                  )}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) void handleLogoUpload(file);
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-carbon)]">Logo</p>
                  <p className="text-xs text-[var(--color-gray-500)]">
                    Opcional · PNG, JPG, WebP
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                    Nombre de tu tienda *
                  </label>
                  <input
                    type="text"
                    value={form.vendorName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vendorName: e.target.value }))
                    }
                    placeholder="Ej. Cafetería La Isla"
                    className="mt-1.5 w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] px-3 py-2.5 text-sm font-medium text-[var(--color-carbon)] placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                    URL de tu tienda *
                  </label>
                  <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] focus-within:border-[var(--color-brand)]">
                    <span className="shrink-0 pl-3 text-xs text-[var(--color-gray-500)]">
                      {appHost}/
                    </span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setForm((f) => ({
                          ...f,
                          slug: slugifyShopName(e.target.value),
                        }));
                      }}
                      placeholder="mi-tienda"
                      className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-medium text-[var(--color-carbon)] placeholder:text-[var(--color-gray-500)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                    Descripción{" "}
                    <span className="font-normal normal-case">(opcional)</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Cuéntale a tus clientes qué vendes…"
                    rows={3}
                    maxLength={280}
                    className="mt-1.5 w-full resize-none rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] px-3 py-2.5 text-sm text-[var(--color-carbon)] placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                  <p className="mt-0.5 text-right text-xs text-[var(--color-gray-500)]">
                    {form.description.length}/280
                  </p>
                </div>
              </div>

              {formError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </p>
              )}

              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleSaveStep1()}
                className="w-full rounded-full bg-[var(--color-brand)] py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {isSaving ? "Guardando…" : "Continuar →"}
              </button>
            </>
          )}

          {/* ── STEP 2: Activa tu plan ── */}
          {currentStep === 2 && (
            <>
              <div className="mt-2">
                <h1 className="text-2xl font-bold text-[var(--color-carbon)]">
                  Activa tu plan
                </h1>
                <p className="mt-1 text-sm text-[var(--color-gray-500)]">
                  Suscríbete para abrir tu tienda y comenzar a vender.
                </p>
              </div>

              {/* Shop summary */}
              {status?.shop && (
                <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  {status.shop.logo_url ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={status.shop.logo_url}
                        alt="Logo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gray-200)]">
                      <span className="text-lg font-bold text-[var(--color-gray-500)]">
                        {((status.shop.vendor_name ?? form.vendorName) || "T")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-[var(--color-carbon)]">
                      {status.shop.vendor_name ?? form.vendorName}
                    </p>
                    <p className="text-xs text-[var(--color-gray-500)]">
                      {appHost}/{status.shop.slug ?? form.slug}
                    </p>
                  </div>
                </div>
              )}

              {/* Plan card */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[var(--color-carbon)]">Plan mensual</p>
                    <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">
                      Cancela cuando quieras
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[var(--color-carbon)]">$10</span>
                    <span className="text-sm text-[var(--color-gray-500)]">/mes</span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {[
                    "Tienda pública en Mitiendita.pr",
                    "Código QR para compartir",
                    "Productos y categorías ilimitadas",
                    "Seguimiento de pedidos en vivo",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[var(--color-gray-500)]">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleStartSubscription()}
                  className="mt-5 w-full rounded-full bg-[var(--color-brand)] py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {isSaving ? "Cargando…" : "Suscribirme por $10/mes"}
                </button>
              </div>

              {/* Access code */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                  ¿Tienes un código de acceso?
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={form.accessCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accessCode: e.target.value }))
                    }
                    placeholder="CODIGO123"
                    className="flex-1 rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] px-3 py-2.5 text-sm font-medium text-[var(--color-carbon)] placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleRedeemCode()}
                    className="shrink-0 rounded-xl border border-[var(--color-carbon)] px-4 py-2.5 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-60"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {infoMsg && (
                <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {infoMsg}
                </p>
              )}
              {formError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </p>
              )}

              <button
                type="button"
                onClick={() => { setFormError(null); setCurrentStep(1); }}
                className="w-full py-2 text-sm text-[var(--color-gray-500)] hover:text-[var(--color-carbon)]"
              >
                ← Volver al paso anterior
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
