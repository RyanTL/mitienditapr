"use client";

import Image from "next/image";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertIcon,
  AthMovilIcon,
  CheckIcon,
  DocumentIcon,
  ImageIcon,
  SettingsIcon,
  StoreIcon,
  TruckIcon,
} from "@/components/icons";
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
  publishVendorShop,
  uploadVendorImage,
  updateVendorShopSettings,
} from "@/lib/vendor/client";
import type { VendorShopStatus } from "@/lib/vendor/constants";
import { toNumber } from "@/lib/utils";

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

const STATUS_BADGE_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  paused: "bg-gray-100 text-gray-600",
  unpaid: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  trialing: "Activa",
  draft: "Borrador",
  paused: "Pausada",
  unpaid: "Impaga",
};

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
    return { label: "Completa", className: "bg-green-100 text-green-700" };
  }
  if (status === "recommended") {
    return { label: "Recomendada", className: "bg-gray-100 text-gray-600" };
  }
  return { label: "Requerida", className: "bg-red-100 text-red-600" };
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
  if (!firstTemplate) return createDefaultPolicyDraft();
  return {
    title: firstTemplate.title,
    body: firstTemplate.bodyTemplate.replace(/\\n/g, "\n"),
    templateId: firstTemplate.id,
    accepted: false,
  } satisfies PolicyDraftState;
}

// ─── Section wrapper ────────────────────────────────────────────────────────

type SectionIconComponent = (props: ComponentPropsWithoutRef<"svg">) => ReactNode;

function Section({
  label,
  description,
  Icon,
  children,
}: {
  label: string;
  description: string;
  Icon: SectionIconComponent;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--color-gray)] bg-white p-5 shadow-[0_8px_24px_var(--shadow-black-003)]">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-carbon)] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--color-carbon)]">{label}</h2>
          <p className="mt-1 max-w-[52ch] text-sm leading-5 text-[var(--color-gray-500)]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

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
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishingPolicy, setIsPublishingPolicy] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

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
        terms: getDraftFromPolicy({ policyType: "terms", policies: policiesResponse, templatesByType: templateMap }),
        shipping: getDraftFromPolicy({ policyType: "shipping", policies: policiesResponse, templatesByType: templateMap }),
        refund: getDraftFromPolicy({ policyType: "refund", policies: policiesResponse, templatesByType: templateMap }),
        privacy: getDraftFromPolicy({ policyType: "privacy", policies: policiesResponse, templatesByType: templateMap }),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar configuración.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

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
        current ? { ...current, shop: response.shop, checks: response.checks } : current,
      );
      setFeedbackMessage("Cambios guardados.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la tienda.");
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
        current ? { ...current, shop: response.shop, checks: response.checks } : current,
      );
      setFeedbackMessage("Estado actualizado.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar estado.");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handlePublishShop = useCallback(async () => {
    setIsPublishing(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const result = await publishVendorShop();
      if (result.published) {
        await loadSettings();
        setFeedbackMessage("¡Tienda publicada!");
      } else {
        setErrorMessage("No se puede publicar: " + result.blockingReasons.join(", "));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo publicar la tienda.");
    } finally {
      setIsPublishing(false);
    }
  }, [loadSettings]);

  const handleUploadLogo = useCallback(async (file: File) => {
    setIsUploadingLogo(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const result = await uploadVendorImage(file);
      setFormState((current) => ({ ...current, logoUrl: result.url }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo subir el logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }, []);

  const handleApplyTemplate = useCallback(() => {
    const draft = policyDrafts[selectedPolicyType];
    if (!draft.templateId) return;
    const template = activeTemplates.find((item) => item.id === draft.templateId);
    if (!template) return;
    setPolicyDrafts((current) => ({
      ...current,
      [selectedPolicyType]: {
        ...current[selectedPolicyType],
        title: template.title,
        body: template.bodyTemplate.replace(/\\n/g, "\n"),
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
        [selectedPolicyType]: { ...current[selectedPolicyType], accepted: false },
      }));
      setFeedbackMessage(
        response.acceptancePending
          ? "Política guardada. Completa Términos y Política de envío para finalizar la aceptación."
          : "Política publicada.",
      );
      await loadSettings();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo publicar la política.");
    } finally {
      setIsPublishingPolicy(false);
    }
  }, [loadSettings, policyDrafts, selectedPolicyType]);

  const shopStatus = statusData?.shop?.status;
  const isActive = shopStatus === "active";
  const blockingReasons = statusData?.checks.blockingReasons ?? [];

  return (
    <VendorPageShell
      title="Configuración de tienda"
      subtitle="Organiza la información pública de tu negocio, tus métodos de pago y los requisitos para publicar."
    >
      {/* Feedback / error banners */}
      {feedbackMessage && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {feedbackMessage}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Información de tienda ── */}
          <div className="rounded-[28px] border border-[var(--color-gray)] bg-white p-5 shadow-[0_8px_24px_var(--shadow-black-003)]">
            {/* Logo upload — square tap-to-replace thumbnail */}
            <div className="mb-4 flex items-center gap-4">
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-gray-100)] text-[var(--color-gray-500)] transition hover:opacity-80"
              >
                {formState.logoUrl ? (
                  <Image
                    src={formState.logoUrl}
                    alt="Logo"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <ImageIcon className="h-7 w-7" />
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (file) void handleUploadLogo(file);
                }}
              />
              <div>
                <p className="text-sm font-semibold text-[var(--color-carbon)]">Logo de tienda</p>
                <p className="mt-0.5 text-sm leading-5 text-[var(--color-gray-500)]">
                  Toca para {formState.logoUrl ? "cambiar" : "subir"} una imagen cuadrada con buena resolución.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Nombre de tienda
                </span>
                <input
                  type="text"
                  value={formState.vendorName}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, vendorName: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-gray-500)]">
                  Este nombre aparece como el título principal de tu tienda.
                </p>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">URL</span>
                <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">mitiendita.pr/</p>
                <input
                  type="text"
                  value={formState.slug}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, slug: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-gray-500)]">
                  Usa un nombre corto y fácil de recordar para compartir tu enlace.
                </p>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Descripción
                </span>
                <textarea
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, description: e.target.value }))
                  }
                  rows={3}
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-gray-500)]">
                  Escribe una descripción breve, clara y fácil de leer desde el celular.
                </p>
              </label>
            </div>
          </div>

          {/* ── Envíos y recogida ── */}
          <Section
            label="Envíos y recogida"
            description="Configura el costo base de envío y si ofreces recogido en persona."
            Icon={TruckIcon}
          >
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Tarifa fija de envío (USD)
                </span>
                <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">$</p>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formState.shippingFlatFeeUsd}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, shippingFlatFeeUsd: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-gray-500)]">
                  Este monto se muestra en el checkout como costo base de envío.
                </p>
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={formState.offersPickup}
                onClick={() =>
                  setFormState((s) => ({ ...s, offersPickup: !s.offersPickup }))
                }
                className="flex w-full items-start justify-between gap-4 rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-4 py-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--color-carbon)]">
                    Ofrecer recogido en persona
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--color-gray-500)]">
                    Actívalo si permites coordinar entrega o pickup directamente con el cliente.
                  </span>
                </span>
                <span
                  className={[
                    "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
                    formState.offersPickup
                      ? "bg-[var(--color-brand)]"
                      : "bg-[var(--color-gray-200,#e5e7eb)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-5 w-5 rounded-full bg-white shadow transition-transform",
                      formState.offersPickup ? "translate-x-5" : "translate-x-0",
                    ].join(" ")}
                  />
                </span>
              </button>
            </div>
          </Section>

          {/* ── Métodos de pago ── */}
          <Section
            label="Métodos de pago"
            description="Añade la información de cobro que quieres mostrar dentro de tu tienda."
            Icon={AthMovilIcon}
          >
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-carbon)]">
                Número ATH Móvil
              </span>
              <input
                type="tel"
                value={formState.athMovilPhone}
                placeholder="787-555-0100"
                onChange={(e) =>
                  setFormState((s) => ({ ...s, athMovilPhone: e.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              <p className="mt-1.5 text-xs leading-5 text-[var(--color-gray-500)]">
                Déjalo en blanco si no usas ATH Móvil. Cuando lo añadas, tus clientes lo verán en la tienda.
              </p>
            </label>

            {/* Save button for settings sections */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="mt-4 w-full rounded-full bg-[var(--color-carbon)] py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </Section>

          {/* ── Políticas ── */}
          <Section
            label="Políticas"
            description="Publica textos claros para tu tienda. Términos y Política de envío son obligatorios para publicar."
            Icon={DocumentIcon}
          >
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] p-3">
              <DocumentIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-carbon)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-carbon)]">
                  Mejora la lectura del texto legal
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-gray-500)]">
                  Usa párrafos cortos y saltos de línea entre secciones para que el contenido se lea bien en móvil.
                </p>
              </div>
            </div>

            <p className="mb-3 text-sm leading-5 text-[var(--color-gray-500)]">
              Reembolso y privacidad siguen siendo recomendadas para dar más confianza a tus clientes.
            </p>

            {/* Policy type selector pills */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {POLICY_TYPES.map((policyType) => {
                const completion = policyData?.completion[policyType] ?? "recommended";
                const badge = mapCompletionBadge(completion);
                const isSelected = selectedPolicyType === policyType;
                return (
                  <button
                    key={policyType}
                    type="button"
                    onClick={() => setSelectedPolicyType(policyType)}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      isSelected
                        ? "bg-[var(--color-carbon)] text-white"
                        : "bg-[var(--color-gray-100,#f3f4f6)] text-[var(--color-carbon)]",
                    ].join(" ")}
                  >
                    {POLICY_TYPE_LABELS[policyType]}
                    <span
                      className={[
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        badge.className,
                      ].join(" ")}
                    >
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {/* Template selector */}
              {activeTemplates.length > 0 && (
                <div className="flex items-end gap-2">
                  <label className="block flex-1">
                    <span className="text-sm font-semibold text-[var(--color-carbon)]">
                      Plantilla
                    </span>
                    <select
                      value={activePolicyDraft.templateId ?? ""}
                      onChange={(e) =>
                        setPolicyDrafts((current) => ({
                          ...current,
                          [selectedPolicyType]: {
                            ...current[selectedPolicyType],
                            templateId: e.target.value || null,
                            accepted: false,
                          },
                        }))
                      }
                      className="mt-1.5 w-full appearance-none rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236d6d6d%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_16px_center] bg-no-repeat px-4 py-3 pr-10 text-sm outline-none"
                    >
                      <option value="">Seleccionar plantilla</option>
                      {activeTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title} (v{template.version})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    className="mb-0.5 shrink-0 rounded-full border border-[var(--color-gray-200,#e5e7eb)] px-3 py-3 text-xs font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)]"
                  >
                    Aplicar
                  </button>
                </div>
              )}

              {/* Title */}
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">Título</span>
                <input
                  type="text"
                  value={activePolicyDraft.title}
                  onChange={(e) =>
                    setPolicyDrafts((current) => ({
                      ...current,
                      [selectedPolicyType]: {
                        ...current[selectedPolicyType],
                        title: e.target.value,
                        accepted: false,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </label>

              {/* Body */}
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Texto legal
                </span>
                <textarea
                  value={activePolicyDraft.body}
                  onChange={(e) =>
                    setPolicyDrafts((current) => ({
                      ...current,
                      [selectedPolicyType]: {
                        ...current[selectedPolicyType],
                        body: e.target.value,
                        accepted: false,
                      },
                    }))
                  }
                  rows={9}
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-gray-500)]">
                  Mantén títulos, párrafos y condiciones en bloques separados para mejorar la lectura.
                </p>
              </label>

              {/* Legal acceptance checkbox */}
              <label className="flex items-start gap-2.5 rounded-2xl bg-[var(--color-gray-100,#f3f4f6)] p-3 text-sm text-[var(--color-carbon)]">
                <input
                  type="checkbox"
                  checked={activePolicyDraft.accepted}
                  onChange={(e) =>
                    setPolicyDrafts((current) => ({
                      ...current,
                      [selectedPolicyType]: {
                        ...current[selectedPolicyType],
                        accepted: e.target.checked,
                      },
                    }))
                  }
                  className="mt-0.5 shrink-0"
                />
                <span className="leading-5">
                  Confirmo que esta política es precisa y cumple con las leyes aplicables a mi negocio.
                </span>
              </label>

              <button
                type="button"
                disabled={isPublishingPolicy}
                onClick={() => void handlePublishPolicy()}
                className="w-full rounded-full bg-[var(--color-carbon)] py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
              >
                {isPublishingPolicy ? "Guardando..." : `Publicar ${POLICY_TYPE_LABELS[selectedPolicyType]}`}
              </button>

              {/* Latest acceptance record */}
              {policyData?.latestAcceptance && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-gray-500)]">
                  <CheckIcon className="h-4 w-4 text-[var(--color-carbon)]" />
                  <p>
                    Última aceptación:{" "}
                    {new Date(policyData.latestAcceptance.acceptedAt).toLocaleString("es-PR")}
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* ── Estado de tienda ── */}
          <Section
            label="Estado de tienda"
            description="Revisa si tu tienda está lista para publicarse o si necesitas completar algún requisito."
            Icon={SettingsIcon}
          >
            {/* Current status badge */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--color-carbon)]">
                  <StoreIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-carbon)]">Estado actual</p>
                  <p className="text-xs leading-5 text-[var(--color-gray-500)]">
                    Controla cuándo tu tienda está visible para compradores.
                  </p>
                </div>
              </div>
              <span
                className={[
                  "rounded-full px-3 py-1 text-sm font-semibold",
                  STATUS_BADGE_STYLE[shopStatus ?? ""] ?? "bg-gray-100 text-gray-600",
                ].join(" ")}
              >
                {STATUS_LABELS[shopStatus ?? ""] ?? shopStatus ?? "—"}
              </span>
            </div>

            {/* Blocking reasons checklist */}
            {blockingReasons.length > 0 && (
              <div className="mb-4 rounded-2xl bg-red-50 p-4">
                <p className="mb-2 text-sm font-semibold text-red-700">
                  Requerido para publicar:
                </p>
                <ul className="space-y-2">
                  {blockingReasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-sm leading-5 text-red-600">
                      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              {!isActive ? (
                <button
                  type="button"
                  disabled={isPublishing || isSaving || blockingReasons.length > 0}
                  onClick={() => void handlePublishShop()}
                  className="flex-1 rounded-full bg-[var(--color-carbon)] py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
                >
                  {isPublishing ? "Publicando..." : "Publicar tienda"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleStatusUpdate("paused")}
                  className="flex-1 rounded-full border border-[var(--color-gray-200,#e5e7eb)] py-3 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-60"
                >
                  Pausar tienda
                </button>
              )}
            </div>
          </Section>
        </>
      )}
    </VendorPageShell>
  );
}
