"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  fetchVendorShopSettings,
  uploadVendorImage,
  updateVendorShopSettings,
} from "@/lib/vendor/client";
import type { VendorShopStatus } from "@/lib/vendor/constants";

type ShopResponse = Awaited<ReturnType<typeof fetchVendorShopSettings>>;

type ShopSettingsFormState = {
  vendorName: string;
  slug: string;
  description: string;
  logoUrl: string;
  shippingFlatFeeUsd: string;
  offersPickup: boolean;
  refundPolicy: string;
  shippingPolicy: string;
  privacyPolicy: string;
  terms: string;
};

const DEFAULT_FORM_STATE: ShopSettingsFormState = {
  vendorName: "",
  slug: "",
  description: "",
  logoUrl: "",
  shippingFlatFeeUsd: "0",
  offersPickup: false,
  refundPolicy: "",
  shippingPolicy: "",
  privacyPolicy: "",
  terms: "",
};

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function mapFormStateFromResponse(response: ShopResponse): ShopSettingsFormState {
  return {
    vendorName: response.shop?.vendor_name ?? "",
    slug: response.shop?.slug ?? "",
    description: response.shop?.description ?? "",
    logoUrl: response.shop?.logo_url ?? "",
    shippingFlatFeeUsd: String(response.shop?.shipping_flat_fee_usd ?? 0),
    offersPickup: response.shop?.offers_pickup ?? false,
    refundPolicy: response.policies?.refund_policy ?? "",
    shippingPolicy: response.policies?.shipping_policy ?? "",
    privacyPolicy: response.policies?.privacy_policy ?? "",
    terms: response.policies?.terms ?? "",
  };
}

function getStatusLabel(status: VendorShopStatus | null | undefined) {
  if (!status) {
    return "No configurado";
  }

  const labels: Record<VendorShopStatus, string> = {
    draft: "Borrador",
    active: "Activa",
    paused: "Pausada",
    unpaid: "Impaga",
  };

  return labels[status];
}

export function VendorShopSettingsClient() {
  const [statusData, setStatusData] = useState<ShopResponse | null>(null);
  const [formState, setFormState] = useState<ShopSettingsFormState>(DEFAULT_FORM_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchVendorShopSettings();
      setStatusData(response);
      setFormState(mapFormStateFromResponse(response));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar configuracion.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await updateVendorShopSettings({
        vendorName: formState.vendorName,
        slug: formState.slug,
        description: formState.description,
        logoUrl: formState.logoUrl || null,
        shippingFlatFeeUsd: Math.max(0, toNumber(formState.shippingFlatFeeUsd, 0)),
        offersPickup: formState.offersPickup,
        policies: {
          refundPolicy: formState.refundPolicy,
          shippingPolicy: formState.shippingPolicy,
          privacyPolicy: formState.privacyPolicy,
          terms: formState.terms,
        },
      });

      setStatusData((current) =>
        current
          ? {
              ...current,
              shop: response.shop,
              checks: response.checks,
            }
          : current,
      );
      setFeedbackMessage("Configuracion guardada.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la tienda.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [formState]);

  const handleStatusUpdate = useCallback(async (nextStatus: VendorShopStatus) => {
    setIsSaving(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await updateVendorShopSettings({ status: nextStatus });
      setStatusData((current) =>
        current
          ? {
              ...current,
              shop: response.shop,
              checks: response.checks,
            }
          : current,
      );
      setFeedbackMessage("Estado de tienda actualizado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar estado.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleUploadLogo = useCallback(async (file: File) => {
    setIsUploadingLogo(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const result = await uploadVendorImage(file);
      setFormState((current) => ({
        ...current,
        logoUrl: result.url,
      }));
      setFeedbackMessage("Logo subido correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el logo.";
      setErrorMessage(message);
    } finally {
      setIsUploadingLogo(false);
    }
  }, []);

  return (
    <VendorPageShell
      title="Ajustes de tienda"
      subtitle="Branding, envio, politicas y estado de publicacion."
    >
      {feedbackMessage ? (
        <article className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-brand)]">
          {feedbackMessage}
        </article>
      ) : null}
      {errorMessage ? (
        <article className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </article>
      ) : null}

      {isLoading ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <p className="text-sm text-[var(--color-gray-500)]">Cargando configuracion...</p>
        </article>
      ) : (
        <>
          <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-gray-500)]">Estado actual</p>
                <p className="text-sm font-semibold">
                  {getStatusLabel(statusData?.shop?.status)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                  disabled={isSaving}
                  onClick={() => void handleStatusUpdate("active")}
                >
                  Activar
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                  disabled={isSaving}
                  onClick={() => void handleStatusUpdate("paused")}
                >
                  Pausar
                </button>
              </div>
            </div>
            {statusData?.checks.blockingReasons.length ? (
              <ul className="mt-3 space-y-1 text-xs text-[var(--color-danger)]">
                {statusData.checks.blockingReasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            ) : null}
          </article>

          <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                  Nombre de tienda
                </span>
                <input
                  type="text"
                  value={formState.vendorName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      vendorName: event.target.value,
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
                    width={64}
                    height={64}
                    unoptimized
                    className="mt-2 h-16 w-16 rounded-full border border-[var(--color-gray)] object-cover"
                  />
                ) : null}
              </label>
            </div>
          </article>

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
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                  Politica de privacidad
                </span>
                <textarea
                  value={formState.privacyPolicy}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      privacyPolicy: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-20 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-gray-500)]">Terminos</span>
                <textarea
                  value={formState.terms}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      terms: event.target.value,
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
              onClick={() => void handleSave()}
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </article>
        </>
      )}
    </VendorPageShell>
  );
}
