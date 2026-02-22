"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

import { CheckIcon } from "@/components/icons";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  createStripeConnectAccountLink,
  createStripeSubscriptionCheckout,
  createVendorProduct,
  fetchVendorStatus,
  publishVendorShop,
  saveVendorOnboardingStep,
  startVendorOnboarding,
  uploadVendorImage,
} from "@/lib/vendor/client";
import {
  VENDOR_ONBOARDING_STEPS,
  VENDOR_ONBOARDING_STEP_COUNT,
} from "@/lib/vendor/constants";
import type { VendorStatusResponse } from "@/lib/vendor/types";

type FormState = {
  businessName: string;
  phone: string;
  category: string;
  bio: string;
  shopName: string;
  slug: string;
  description: string;
  logoUrl: string;
  shippingFlatFeeUsd: string;
  offersPickup: boolean;
  refundPolicy: string;
  shippingPolicy: string;
  privacyPolicy: string;
  terms: string;
  firstProductName: string;
  firstProductDescription: string;
  firstProductPriceUsd: string;
  firstProductStockQty: string;
  firstProductImageUrl: string;
};

const DEFAULT_FORM_STATE: FormState = {
  businessName: "",
  phone: "",
  category: "",
  bio: "",
  shopName: "",
  slug: "",
  description: "",
  logoUrl: "",
  shippingFlatFeeUsd: "0",
  offersPickup: false,
  refundPolicy: "No se aceptan devoluciones despues de 7 dias.",
  shippingPolicy: "Envios de 1 a 3 dias laborables.",
  privacyPolicy: "Tus datos se usan solo para procesar ordenes.",
  terms: "Al comprar aceptas los terminos de la tienda.",
  firstProductName: "",
  firstProductDescription: "",
  firstProductPriceUsd: "10",
  firstProductStockQty: "1",
  firstProductImageUrl: "",
};

function mapStepPayload(
  source: Record<string, unknown> | null | undefined,
  step: number,
) {
  if (!source) {
    return null;
  }

  const value = source[`step_${step}`];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(input: Record<string, unknown> | null, key: string, fallback = "") {
  if (!input) {
    return fallback;
  }

  const value = input[key];
  return typeof value === "string" ? value : fallback;
}

function getBoolean(input: Record<string, unknown> | null, key: string, fallback = false) {
  if (!input) {
    return fallback;
  }

  const value = input[key];
  return typeof value === "boolean" ? value : fallback;
}

function hydrateFormFromStatus(
  snapshot: VendorStatusResponse,
  currentFormState: FormState,
) {
  const step2 = mapStepPayload(snapshot.onboarding?.data_json, 2);
  const step3 = mapStepPayload(snapshot.onboarding?.data_json, 3);
  const step4 = mapStepPayload(snapshot.onboarding?.data_json, 4);
  const step7 = mapStepPayload(snapshot.onboarding?.data_json, 7);

  return {
    ...currentFormState,
    businessName:
      getString(step2, "businessName", "") ||
      snapshot.shop?.vendor_name ||
      snapshot.profile.full_name ||
      "",
    phone: getString(step2, "phone", currentFormState.phone),
    category: getString(step2, "category", currentFormState.category),
    bio: getString(step2, "bio", currentFormState.bio),
    shopName: getString(step3, "shopName", snapshot.shop?.vendor_name ?? ""),
    slug: getString(step3, "slug", snapshot.shop?.slug ?? ""),
    description: getString(step3, "description", snapshot.shop?.description ?? ""),
    logoUrl: getString(step3, "logoUrl", snapshot.shop?.logo_url ?? ""),
    shippingFlatFeeUsd:
      getString(
        step4,
        "shippingFlatFeeUsd",
        String(snapshot.shop?.shipping_flat_fee_usd ?? 0),
      ) || "0",
    offersPickup: getBoolean(step4, "offersPickup", snapshot.shop?.offers_pickup ?? false),
    refundPolicy: getString(step4, "refundPolicy", currentFormState.refundPolicy),
    shippingPolicy: getString(step4, "shippingPolicy", currentFormState.shippingPolicy),
    privacyPolicy: getString(step4, "privacyPolicy", currentFormState.privacyPolicy),
    terms: getString(step4, "terms", currentFormState.terms),
    firstProductName: getString(step7, "firstProductName", currentFormState.firstProductName),
    firstProductDescription: getString(
      step7,
      "firstProductDescription",
      currentFormState.firstProductDescription,
    ),
    firstProductPriceUsd: getString(
      step7,
      "firstProductPriceUsd",
      currentFormState.firstProductPriceUsd,
    ),
    firstProductStockQty: getString(
      step7,
      "firstProductStockQty",
      currentFormState.firstProductStockQty,
    ),
    firstProductImageUrl: getString(
      step7,
      "firstProductImageUrl",
      currentFormState.firstProductImageUrl,
    ),
  };
}

function toNumber(input: string, fallback = 0) {
  const parsed = Number(input);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

export function VendorOnboardingClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VendorStatusResponse | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFirstProductImage, setIsUploadingFirstProductImage] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const nextStatus = await fetchVendorStatus();
    setStatus(nextStatus);
    setFormState((current) => hydrateFormFromStatus(nextStatus, current));
    return nextStatus;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await startVendorOnboarding();
        if (!isMounted) {
          return;
        }

        setStatus(response.snapshot);
        setFormState((current) =>
          hydrateFormFromStatus(response.snapshot, current),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "No se pudo cargar onboarding.";
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("connect") === "done") {
      setFeedback("Stripe Connect completado. Continua con el siguiente paso.");
    } else if (searchParams.get("subscription") === "success") {
      setFeedback("Suscripcion activada correctamente.");
    } else if (searchParams.get("subscription") === "cancel") {
      setFeedback("Puedes intentar el checkout de suscripcion nuevamente.");
    }
  }, [searchParams]);

  const currentStep = useMemo(() => {
    if (!status?.onboarding) {
      return 1;
    }
    return Math.min(Math.max(status.onboarding.current_step, 1), VENDOR_ONBOARDING_STEP_COUNT);
  }, [status?.onboarding]);

  const completionRatio = `${Math.round((currentStep / VENDOR_ONBOARDING_STEP_COUNT) * 100)}%`;

  const handleSaveStep = useCallback(
    async (step: number, payload: Record<string, unknown>) => {
      setIsSaving(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        await saveVendorOnboardingStep(step, payload);
        await refreshStatus();
        setFeedback("Paso guardado correctamente.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo guardar el paso.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [refreshStatus],
  );

  const handleConnectStripe = useCallback(async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const response = await createStripeConnectAccountLink();
      await handleSaveStep(5, {
        stripeConnectAccountId: response.stripeConnectAccountId,
        connectStarted: true,
      });
      window.location.assign(response.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo conectar Stripe.";
      setErrorMessage(message);
      setIsSaving(false);
    }
  }, [handleSaveStep]);

  const handleStartSubscription = useCallback(async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const response = await createStripeSubscriptionCheckout();
      await handleSaveStep(6, { subscriptionCheckoutStarted: true });
      window.location.assign(response.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo abrir checkout.";
      setErrorMessage(message);
      setIsSaving(false);
    }
  }, [handleSaveStep]);

  const handleCreateFirstProduct = useCallback(async () => {
    const name = formState.firstProductName.trim();
    if (!name) {
      setErrorMessage("Debes indicar nombre del producto.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      await createVendorProduct({
        name,
        description: formState.firstProductDescription.trim(),
        imageUrl: formState.firstProductImageUrl.trim() || undefined,
        variant: {
          title: "Default",
          priceUsd: Math.max(0, toNumber(formState.firstProductPriceUsd, 0)),
          stockQty: Math.max(0, Math.trunc(toNumber(formState.firstProductStockQty, 0))),
        },
      });

      await handleSaveStep(7, {
        firstProductName: formState.firstProductName,
        firstProductDescription: formState.firstProductDescription,
        firstProductPriceUsd: formState.firstProductPriceUsd,
        firstProductStockQty: formState.firstProductStockQty,
        firstProductImageUrl: formState.firstProductImageUrl,
      });
      setFeedback("Tu primer producto se creo correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el producto.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [formState, handleSaveStep]);

  const handleUploadLogo = useCallback(async (file: File) => {
    setIsUploadingLogo(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const result = await uploadVendorImage(file);
      setFormState((current) => ({
        ...current,
        logoUrl: result.url,
      }));
      setFeedback("Logo subido correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el logo.";
      setErrorMessage(message);
    } finally {
      setIsUploadingLogo(false);
    }
  }, []);

  const handleUploadFirstProductImage = useCallback(async (file: File) => {
    setIsUploadingFirstProductImage(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const result = await uploadVendorImage(file);
      setFormState((current) => ({
        ...current,
        firstProductImageUrl: result.url,
      }));
      setFeedback("Imagen del producto subida correctamente.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir la imagen del producto.";
      setErrorMessage(message);
    } finally {
      setIsUploadingFirstProductImage(false);
    }
  }, []);

  const handlePublish = useCallback(async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const result = await publishVendorShop();
      await refreshStatus();

      if (!result.published) {
        setErrorMessage(
          `Aun no puedes publicar: ${result.blockingReasons.join(" • ")}`,
        );
        return;
      }

      setFeedback("Tienda publicada. Ya puedes vender en la app.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo publicar la tienda.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [refreshStatus]);

  if (isLoading) {
    return (
      <VendorPageShell
        title="Onboarding de vendedor"
        subtitle="Preparando tu cuenta para vender."
      >
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-gray-500)]">Cargando onboarding...</p>
        </article>
      </VendorPageShell>
    );
  }

  if (!status) {
    return (
      <VendorPageShell
        title="Onboarding de vendedor"
        subtitle="No pudimos cargar tu estado actual."
      >
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-danger)]">
            {errorMessage ?? "Intenta recargar la pagina."}
          </p>
        </article>
      </VendorPageShell>
    );
  }

  const checks = status.checks;

  return (
    <VendorPageShell
      title="Conviertete en vendedor"
      subtitle="Completa este checklist para abrir tu tienda."
    >
      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-carbon)]">
            Progreso: paso {currentStep} de {VENDOR_ONBOARDING_STEP_COUNT}
          </p>
          <p className="text-xs text-[var(--color-gray-500)]">{completionRatio}</p>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-gray-200)]">
          <div
            className="h-2 rounded-full bg-[var(--color-brand)] transition-all"
            style={{ width: completionRatio }}
          />
        </div>
      </article>

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <ul className="space-y-2">
          {VENDOR_ONBOARDING_STEPS.map((stepMeta) => {
            const isDone = stepMeta.step < currentStep;
            const isCurrent = stepMeta.step === currentStep;

            return (
              <li
                key={stepMeta.step}
                className={[
                  "flex items-start gap-3 rounded-2xl px-2 py-2",
                  isCurrent ? "bg-[var(--color-gray-100)]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    isDone
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-white)]"
                      : "border-[var(--color-gray)] text-[var(--color-carbon)]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {isDone ? <CheckIcon className="h-3 w-3" /> : stepMeta.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-carbon)]">
                    {stepMeta.title}
                  </p>
                  <p className="text-xs text-[var(--color-gray-500)]">{stepMeta.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      {feedback ? (
        <article className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-brand)]">
          {feedback}
        </article>
      ) : null}
      {errorMessage ? (
        <article className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </article>
      ) : null}

      {currentStep === 1 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-gray-500)]">
            En esta app vendes creando tu tienda, publicando productos y recibiendo
            pagos directo en Stripe Connect.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() => void handleSaveStep(1, { introCompleted: true })}
          >
            {isSaving ? "Guardando..." : "Guardar y continuar"}
          </button>
        </article>
      ) : null}

      {currentStep === 2 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Nombre del negocio
              </span>
              <input
                type="text"
                value={formState.businessName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    businessName: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">Telefono</span>
              <input
                type="text"
                value={formState.phone}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">Categoria</span>
              <input
                type="text"
                value={formState.category}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Bio corta
              </span>
              <textarea
                value={formState.bio}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                className="mt-1 min-h-24 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() =>
              void handleSaveStep(2, {
                businessName: formState.businessName,
                phone: formState.phone,
                category: formState.category,
                bio: formState.bio,
              })
            }
          >
            {isSaving ? "Guardando..." : "Guardar y continuar"}
          </button>
        </article>
      ) : null}

      {currentStep === 3 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Nombre de tienda
              </span>
              <input
                type="text"
                value={formState.shopName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    shopName: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">Slug</span>
              <input
                type="text"
                value={formState.slug}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Descripcion
              </span>
              <textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="mt-1 min-h-24 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Logo de tienda
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingLogo}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) {
                    void handleUploadLogo(file);
                  }
                }}
                className="mt-1 block w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
              {isUploadingLogo ? (
                <p className="mt-1 text-xs text-[var(--color-gray-500)]">Subiendo logo...</p>
              ) : null}
              {formState.logoUrl ? (
                <Image
                  src={formState.logoUrl}
                  alt="Vista previa del logo"
                  width={56}
                  height={56}
                  unoptimized
                  className="mt-2 h-14 w-14 rounded-full border border-[var(--color-gray)] object-cover"
                />
              ) : null}
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() =>
              void handleSaveStep(3, {
                shopName: formState.shopName,
                slug: formState.slug,
                description: formState.description,
                logoUrl: formState.logoUrl,
              })
            }
          >
            {isSaving ? "Guardando..." : "Guardar y continuar"}
          </button>
        </article>
      ) : null}

      {currentStep === 4 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Tarifa fija de envio (USD)
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formState.shippingFlatFeeUsd}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    shippingFlatFeeUsd: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.offersPickup}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    offersPickup: event.target.checked,
                  }))
                }
              />
              Ofrecer recogido en persona
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Politica de reembolso
              </span>
              <textarea
                value={formState.refundPolicy}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    refundPolicy: event.target.value,
                  }))
                }
                className="mt-1 min-h-20 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Politica de envio
              </span>
              <textarea
                value={formState.shippingPolicy}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    shippingPolicy: event.target.value,
                  }))
                }
                className="mt-1 min-h-20 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() =>
              void handleSaveStep(4, {
                shippingFlatFeeUsd: toNumber(formState.shippingFlatFeeUsd, 0),
                offersPickup: formState.offersPickup,
                refundPolicy: formState.refundPolicy,
                shippingPolicy: formState.shippingPolicy,
                privacyPolicy: formState.privacyPolicy,
                terms: formState.terms,
              })
            }
          >
            {isSaving ? "Guardando..." : "Guardar y continuar"}
          </button>
        </article>
      ) : null}

      {currentStep === 5 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-gray-500)]">
            Necesitas Stripe Connect Express para recibir pagos de compradores.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() => void handleConnectStripe()}
          >
            {isSaving ? "Abriendo..." : "Conectar Stripe Express"}
          </button>
        </article>
      ) : null}

      {currentStep === 6 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-gray-500)]">
            Activa la suscripcion de $10/mes para publicar tu tienda.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() => void handleStartSubscription()}
          >
            {isSaving ? "Abriendo..." : "Ir a checkout de suscripcion"}
          </button>
        </article>
      ) : null}

      {currentStep === 7 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Nombre producto
              </span>
              <input
                type="text"
                value={formState.firstProductName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    firstProductName: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Precio (USD)
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formState.firstProductPriceUsd}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    firstProductPriceUsd: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">Stock</span>
              <input
                type="number"
                min={0}
                step={1}
                value={formState.firstProductStockQty}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    firstProductStockQty: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Imagen del producto (opcional)
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingFirstProductImage}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) {
                    void handleUploadFirstProductImage(file);
                  }
                }}
                className="mt-1 block w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
              {isUploadingFirstProductImage ? (
                <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                  Subiendo imagen...
                </p>
              ) : null}
              {formState.firstProductImageUrl ? (
                <Image
                  src={formState.firstProductImageUrl}
                  alt="Vista previa del producto"
                  width={80}
                  height={80}
                  unoptimized
                  className="mt-2 h-20 w-20 rounded-xl border border-[var(--color-gray)] object-cover"
                />
              ) : null}
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
            disabled={isSaving}
            onClick={() => void handleCreateFirstProduct()}
          >
            {isSaving ? "Guardando..." : "Crear producto y continuar"}
          </button>
        </article>
      ) : null}

      {currentStep === 8 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-gray-500)]">
            Revisa tus requisitos y publica tu tienda.
          </p>

          <ul className="mt-3 space-y-1 text-sm">
            {checks.blockingReasons.length > 0 ? (
              checks.blockingReasons.map((reason) => (
                <li key={reason} className="text-[var(--color-danger)]">
                  • {reason}
                </li>
              ))
            ) : (
              <li className="text-[var(--color-brand)]">Todo listo para publicar.</li>
            )}
          </ul>

          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)] disabled:opacity-60"
            disabled={isSaving || !checks.canPublish}
            onClick={() => void handlePublish()}
          >
            {isSaving ? "Publicando..." : "Publicar tienda"}
          </button>
        </article>
      ) : null}
    </VendorPageShell>
  );
}
