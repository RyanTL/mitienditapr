"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
  POLICY_TYPE_LABELS,
} from "@/lib/policies/constants";
import {
  fetchVendorPolicyTemplates,
  fetchVendorShopPolicies,
  publishVendorShopPolicy,
} from "@/lib/policies/client";
import type {
  PolicyTemplate,
  PolicyType,
  VendorPolicyCompletion,
  VendorShopPoliciesResponse,
} from "@/lib/policies/types";
import {
  fetchVendorShopSettings,
  uploadVendorImage,
  updateVendorShopSettings,
} from "@/lib/vendor/client";
import type { VendorShopStatus } from "@/lib/vendor/constants";

type ShopResponse = Awaited<ReturnType<typeof fetchVendorShopSettings>>;

type PolicyDraftState = {
  title: string;
  body: string;
  templateId: string | null;
  accepted: boolean;
};

type ShopSettingsFormState = {
  vendorName: string;
  slug: string;
  description: string;
  logoUrl: string;
  shippingFlatFeeUsd: string;
  offersPickup: boolean;
  athMovilPhone: string;
};

const DEFAULT_FORM_STATE: ShopSettingsFormState = {
  vendorName: "",
  slug: "",
  description: "",
  logoUrl: "",
  shippingFlatFeeUsd: "0",
  offersPickup: false,
  athMovilPhone: "",
};

const POLICY_TYPES: PolicyType[] = ["terms", "shipping", "refund", "privacy"];

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
    athMovilPhone: response.shop?.ath_movil_phone ?? "",
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

function createDefaultPolicyDraft() {
  return {
    title: "",
    body: "",
    templateId: null,
    accepted: false,
  } satisfies PolicyDraftState;
}

function mapCompletionBadge(status: VendorPolicyCompletion[PolicyType]) {
  if (status === "completed") {
    return {
      label: "Completada",
      className: "bg-[var(--color-brand)] text-[var(--color-white)]",
    };
  }

  if (status === "recommended") {
    return {
      label: "Recomendada",
      className: "bg-[var(--color-gray)] text-[var(--color-carbon)]",
    };
  }

  return {
    label: "Falta para publicar",
    className: "bg-[var(--color-danger)] text-[var(--color-white)]",
  };
}

function getDraftFromPolicy(input: {
  policyType: PolicyType;
  policies: VendorShopPoliciesResponse | null;
  templatesByType: Map<PolicyType, PolicyTemplate[]>;
}) {
  const { policyType, policies, templatesByType } = input;
  const current = policies?.currentPolicies[policyType];
  if (current) {
    return {
      title: current.title,
      body: current.body,
      templateId: current.sourceTemplateId ?? null,
      accepted: false,
    } satisfies PolicyDraftState;
  }

  const firstTemplate = templatesByType.get(policyType)?.[0];
  if (!firstTemplate) {
    return createDefaultPolicyDraft();
  }

  return {
    title: firstTemplate.title,
    body: firstTemplate.bodyTemplate,
    templateId: firstTemplate.id,
    accepted: false,
  } satisfies PolicyDraftState;
}

export function VendorShopSettingsClient() {
  const [statusData, setStatusData] = useState<ShopResponse | null>(null);
  const [formState, setFormState] = useState<ShopSettingsFormState>(DEFAULT_FORM_STATE);
  const [policyTemplates, setPolicyTemplates] = useState<PolicyTemplate[]>([]);
  const [policyData, setPolicyData] = useState<VendorShopPoliciesResponse | null>(null);
  const [selectedPolicyType, setSelectedPolicyType] = useState<PolicyType>("terms");
  const [policyDrafts, setPolicyDrafts] = useState<Record<PolicyType, PolicyDraftState>>({
    terms: createDefaultPolicyDraft(),
    shipping: createDefaultPolicyDraft(),
    refund: createDefaultPolicyDraft(),
    privacy: createDefaultPolicyDraft(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishingPolicy, setIsPublishingPolicy] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const templatesByType = useMemo(() => {
    return policyTemplates.reduce((map, template) => {
      const current = map.get(template.policyType) ?? [];
      map.set(template.policyType, [...current, template]);
      return map;
    }, new Map<PolicyType, PolicyTemplate[]>());
  }, [policyTemplates]);

  const activePolicyDraft = policyDrafts[selectedPolicyType];
  const activeTemplates = useMemo(
    () => templatesByType.get(selectedPolicyType) ?? [],
    [selectedPolicyType, templatesByType],
  );

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [shopResponse, templatesResponse, policiesResponse] = await Promise.all([
        fetchVendorShopSettings(),
        fetchVendorPolicyTemplates(),
        fetchVendorShopPolicies(),
      ]);

      setStatusData(shopResponse);
      setFormState(mapFormStateFromResponse(shopResponse));
      setPolicyTemplates(templatesResponse.templates);
      setPolicyData(policiesResponse);

      const templateMap = templatesResponse.templates.reduce((map, template) => {
        const current = map.get(template.policyType) ?? [];
        map.set(template.policyType, [...current, template]);
        return map;
      }, new Map<PolicyType, PolicyTemplate[]>());

      setPolicyDrafts({
        terms: getDraftFromPolicy({
          policyType: "terms",
          policies: policiesResponse,
          templatesByType: templateMap,
        }),
        shipping: getDraftFromPolicy({
          policyType: "shipping",
          policies: policiesResponse,
          templatesByType: templateMap,
        }),
        refund: getDraftFromPolicy({
          policyType: "refund",
          policies: policiesResponse,
          templatesByType: templateMap,
        }),
        privacy: getDraftFromPolicy({
          policyType: "privacy",
          policies: policiesResponse,
          templatesByType: templateMap,
        }),
      });
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
        athMovilPhone: formState.athMovilPhone.trim() || null,
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

  const handleApplyTemplate = useCallback(() => {
    const draft = policyDrafts[selectedPolicyType];
    if (!draft.templateId) {
      return;
    }

    const template = activeTemplates.find((item) => item.id === draft.templateId);
    if (!template) {
      return;
    }

    setPolicyDrafts((current) => ({
      ...current,
      [selectedPolicyType]: {
        ...current[selectedPolicyType],
        title: template.title,
        body: template.bodyTemplate,
        accepted: false,
      },
    }));
  }, [activeTemplates, policyDrafts, selectedPolicyType]);

  const handlePublishPolicy = useCallback(async () => {
    const draft = policyDrafts[selectedPolicyType];

    setIsPublishingPolicy(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await publishVendorShopPolicy(selectedPolicyType, {
        title: draft.title,
        body: draft.body,
        templateId: draft.templateId,
        acceptanceScope: "update",
        acceptanceText: DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
        accepted: draft.accepted,
      });

      setPolicyData(response);
      setPolicyDrafts((current) => ({
        ...current,
        [selectedPolicyType]: {
          ...current[selectedPolicyType],
          accepted: false,
        },
      }));

      setFeedbackMessage(
        response.acceptancePending
          ? "Politica publicada. Completa Terminos y Politica de envio para finalizar la aceptacion legal."
          : "Politica publicada y aceptacion legal registrada.",
      );
      await loadSettings();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo publicar la politica.";
      setErrorMessage(message);
    } finally {
      setIsPublishingPolicy(false);
    }
  }, [loadSettings, policyDrafts, selectedPolicyType]);

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

          <div className="grid gap-3 md:grid-cols-2 md:items-start">
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
                    Número de ATH Móvil Business
                  </span>
                  <input
                    type="tel"
                    value={formState.athMovilPhone}
                    placeholder="787-555-0100"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        athMovilPhone: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
                  />
                  <span className="mt-0.5 block text-[11px] text-[var(--color-gray-500)]">
                    Deja en blanco si no usas ATH Móvil.
                  </span>
                </label>

                <div className="rounded-2xl bg-[var(--color-gray)] px-3 py-2 text-xs text-[var(--color-carbon)]">
                  <p className="font-semibold">Educacion rapida</p>
                  <p className="mt-1">
                    Evita texto ambiguo: define tiempos de envio, condiciones de devolucion y
                    responsabilidades del vendedor claramente.
                  </p>
                </div>
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
          </div>

          <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
            <h2 className="text-base font-bold">Wizard de politicas y terminos</h2>
            <p className="mt-1 text-xs text-[var(--color-gray-500)]">
              Completa Terminos + Politica de envio para publicar. Reembolso y privacidad son
              recomendadas.
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {POLICY_TYPES.map((policyType) => {
                const completion = policyData?.completion[policyType] ?? "recommended";
                const badge = mapCompletionBadge(completion);
                return (
                  <button
                    key={policyType}
                    type="button"
                    onClick={() => setSelectedPolicyType(policyType)}
                    className={[
                      "flex items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm",
                      selectedPolicyType === policyType
                        ? "border-[var(--color-brand)]"
                        : "border-[var(--color-gray)]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>{POLICY_TYPE_LABELS[policyType]}</span>
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-[10px] font-semibold",
                        badge.className,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                    Paso A: Plantilla
                  </span>
                  <select
                    value={activePolicyDraft.templateId ?? ""}
                    onChange={(event) =>
                      setPolicyDrafts((current) => ({
                        ...current,
                        [selectedPolicyType]: {
                          ...current[selectedPolicyType],
                          templateId: event.target.value || null,
                          accepted: false,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona una plantilla</option>
                    {activeTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title} (v{template.version})
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                  onClick={handleApplyTemplate}
                >
                  Aplicar plantilla
                </button>

                <label className="block">
                  <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                    Paso B: Titulo
                  </span>
                  <input
                    type="text"
                    value={activePolicyDraft.title}
                    onChange={(event) =>
                      setPolicyDrafts((current) => ({
                        ...current,
                        [selectedPolicyType]: {
                          ...current[selectedPolicyType],
                          title: event.target.value,
                          accepted: false,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                    Paso B: Texto legal editable
                  </span>
                  <textarea
                    value={activePolicyDraft.body}
                    onChange={(event) =>
                      setPolicyDrafts((current) => ({
                        ...current,
                        [selectedPolicyType]: {
                          ...current[selectedPolicyType],
                          body: event.target.value,
                          accepted: false,
                        },
                      }))
                    }
                    className="mt-1 min-h-[210px] w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex items-start gap-2 rounded-2xl bg-[var(--color-gray)] px-3 py-3 text-xs text-[var(--color-carbon)]">
                  <input
                    type="checkbox"
                    checked={activePolicyDraft.accepted}
                    onChange={(event) =>
                      setPolicyDrafts((current) => ({
                        ...current,
                        [selectedPolicyType]: {
                          ...current[selectedPolicyType],
                          accepted: event.target.checked,
                        },
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span>
                    Paso D: Confirmo que esta politica es precisa y cumple con las leyes
                    aplicables a mi negocio.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isPublishingPolicy}
                  onClick={() => void handlePublishPolicy()}
                  className="w-full rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)] disabled:opacity-70"
                >
                  {isPublishingPolicy ? "Publicando..." : "Publicar version de politica"}
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3">
                  <p className="text-xs font-semibold text-[var(--color-gray-500)]">
                    Paso C: Vista previa para compradores
                  </p>
                  <h3 className="mt-2 text-sm font-bold text-[var(--color-carbon)]">
                    {activePolicyDraft.title || POLICY_TYPE_LABELS[selectedPolicyType]}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[var(--color-carbon)]">
                    {activePolicyDraft.body || "Sin contenido."}
                  </p>
                </div>

                {policyData?.latestAcceptance ? (
                  <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3 text-xs text-[var(--color-carbon)]">
                    <p className="font-semibold">Ultima aceptacion legal</p>
                    <p className="mt-1">
                      {new Date(policyData.latestAcceptance.acceptedAt).toLocaleString("es-PR")}
                    </p>
                    <p className="mt-1">
                      Alcance: {policyData.latestAcceptance.acceptanceScope}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3 text-xs text-[var(--color-carbon)]">
                    Aun no hay aceptacion legal registrada para esta tienda.
                  </div>
                )}
              </div>
            </div>
          </article>
        </>
      )}
    </VendorPageShell>
  );
}
