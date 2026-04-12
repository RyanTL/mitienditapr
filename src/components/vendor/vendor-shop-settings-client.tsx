"use client";

import Image from "next/image";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertIcon,
  AthMovilIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentIcon,
  ImageIcon,
  InfoIcon,
  PencilIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StoreIcon,
  TruckIcon,
  UserIcon,
} from "@/components/icons";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
  POLICY_TYPE_LABELS,
  POLICY_TYPE_DESCRIPTIONS,
} from "@/lib/policies/constants";
import {
  fetchVendorPolicyTemplates,
  fetchVendorShopPolicies,
  publishVendorShopPolicy,
} from "@/lib/policies/client";
import type {
  PolicyTemplate,
  PolicyType,
  VendorShopPoliciesResponse,
} from "@/lib/policies/types";
import {
  createStripeConnectAccountLink,
  fetchVendorShopSettings,
  uploadVendorImage,
  updateVendorShopSettings,
} from "@/lib/vendor/client";
import type { VendorShopStatus } from "@/lib/vendor/constants";
import { toNumber } from "@/lib/utils";
import type { VendorShopSettingsResponse } from "@/lib/vendor/types";

type ShopResponse = VendorShopSettingsResponse;

type VendorShopSettingsClientProps = {
  initialStatusData?: ShopResponse;
  initialPolicyTemplates?: PolicyTemplate[];
  initialPolicyData?: VendorShopPoliciesResponse;
};

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
  contactPhone: string;
  contactInstagram: string;
  contactFacebook: string;
  contactWhatsapp: string;
};

const DEFAULT_FORM_STATE: ShopSettingsFormState = {
  vendorName: "",
  slug: "",
  description: "",
  logoUrl: "",
  shippingFlatFeeUsd: "0",
  offersPickup: false,
  athMovilPhone: "",
  contactPhone: "",
  contactInstagram: "",
  contactFacebook: "",
  contactWhatsapp: "",
};

const POLICY_TYPES: PolicyType[] = ["terms", "shipping", "refund", "privacy"];

const STATUS_DOT_STYLE: Record<string, string> = {
  active: "bg-green-500",
  trialing: "bg-green-500",
  draft: "bg-amber-400",
  paused: "bg-[var(--color-gray-500)]",
  unpaid: "bg-[var(--color-danger)]",
};

const STATUS_TEXT_STYLE: Record<string, string> = {
  active: "text-green-700",
  trialing: "text-green-700",
  draft: "text-amber-700",
  paused: "text-[var(--color-gray-500)]",
  unpaid: "text-[var(--color-danger)]",
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
    contactPhone: response.shop?.contact_phone ?? "",
    contactInstagram: response.shop?.contact_instagram ?? "",
    contactFacebook: response.shop?.contact_facebook ?? "",
    contactWhatsapp: response.shop?.contact_whatsapp ?? "",
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

function buildTemplatesByType(templates: PolicyTemplate[]) {
  return templates.reduce((map, template) => {
    const current = map.get(template.policyType) ?? [];
    map.set(template.policyType, [...current, template]);
    return map;
  }, new Map<PolicyType, PolicyTemplate[]>());
}

function buildPolicyDrafts(
  policies: VendorShopPoliciesResponse | null,
  templates: PolicyTemplate[],
) {
  const templatesByType = buildTemplatesByType(templates);

  return {
    terms: getDraftFromPolicy({
      policyType: "terms",
      policies,
      templatesByType,
    }),
    shipping: getDraftFromPolicy({
      policyType: "shipping",
      policies,
      templatesByType,
    }),
    refund: getDraftFromPolicy({
      policyType: "refund",
      policies,
      templatesByType,
    }),
    privacy: getDraftFromPolicy({
      policyType: "privacy",
      policies,
      templatesByType,
    }),
  };
}

function isPolicyDraftDirty(
  policyType: PolicyType,
  draft: PolicyDraftState,
  policies: VendorShopPoliciesResponse | null,
) {
  const current = policies?.currentPolicies[policyType];

  if (!current) {
    return draft.title.trim().length > 0 || draft.body.trim().length > 0;
  }

  return (
    draft.title.trim() !== current.title.trim() ||
    draft.body.trim() !== current.body.trim()
  );
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
        <div className="shrink-0 text-[var(--color-carbon)]">
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

export function VendorShopSettingsClient({
  initialStatusData,
  initialPolicyTemplates = [],
  initialPolicyData,
}: VendorShopSettingsClientProps) {
  const hasInitialData = Boolean(initialStatusData && initialPolicyData);
  const [statusData, setStatusData] = useState<ShopResponse | null>(
    initialStatusData ?? null,
  );
  const [formState, setFormState] = useState<ShopSettingsFormState>(() =>
    initialStatusData ? mapFormStateFromResponse(initialStatusData) : DEFAULT_FORM_STATE,
  );
  const [policyTemplates, setPolicyTemplates] = useState<PolicyTemplate[]>(
    initialPolicyTemplates,
  );
  const [policyData, setPolicyData] = useState<VendorShopPoliciesResponse | null>(
    initialPolicyData ?? null,
  );
  const [isPolicyEditorOpen, setIsPolicyEditorOpen] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState<PolicyType>("terms");
  const [expandedPolicyCard, setExpandedPolicyCard] = useState<PolicyType | null>(null);
  const [policyDrafts, setPolicyDrafts] = useState<Record<PolicyType, PolicyDraftState>>(
    () => buildPolicyDrafts(initialPolicyData ?? null, initialPolicyTemplates),
  );
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishingPolicy, setIsPublishingPolicy] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const templatesByType = useMemo(() => {
    return buildTemplatesByType(policyTemplates);
  }, [policyTemplates]);

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
      setPolicyDrafts(
        buildPolicyDrafts(policiesResponse, templatesResponse.templates),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar configuración.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialData) {
      return;
    }

    void loadSettings();
  }, [hasInitialData, loadSettings]);

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
        contactPhone: formState.contactPhone.trim() || null,
        contactInstagram: formState.contactInstagram.trim() || null,
        contactFacebook: formState.contactFacebook.trim() || null,
        contactWhatsapp: formState.contactWhatsapp.trim() || null,
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
      setExpandedPolicyCard(null);
      setIsPolicyEditorOpen(false);
      setFeedbackMessage("Política guardada.");
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
  const stripeConfigured = Boolean(statusData?.shop?.stripe_connect_account_id);
  const athConfigured = formState.athMovilPhone.trim().length > 0;

  const handleConnectStripe = useCallback(async () => {
    setIsConnectingStripe(true);
    setErrorMessage(null);
    try {
      const response = await createStripeConnectAccountLink();
      window.location.assign(response.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo abrir Stripe.");
      setIsConnectingStripe(false);
    }
  }, []);

  return (
    <VendorPageShell
      title="Configuración de tienda"
      subtitle="Organiza la información pública de tu negocio, tus métodos de pago y las opciones avanzadas de tu tienda."
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
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-carbon)]">
                      Stripe Checkout
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-gray-500)]">
                      Cobra con tarjeta y deja que Stripe envíe el dinero a tu cuenta conectada.
                    </p>
                  </div>
                  <span
                    className={[
                      "flex items-center gap-1.5 text-xs font-semibold",
                      stripeConfigured
                        ? "text-green-700"
                        : "text-amber-600",
                    ].join(" ")}
                  >
                    <span className={[
                      "inline-block h-2 w-2 rounded-full",
                      stripeConfigured ? "bg-green-500" : "bg-amber-400",
                    ].join(" ")} />
                    {stripeConfigured ? "Conectado" : "Pendiente"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isConnectingStripe}
                  onClick={() => void handleConnectStripe()}
                  className="mt-4 rounded-full border border-[var(--color-carbon)] px-4 py-2 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100,#f9fafb)] disabled:opacity-60"
                >
                  {isConnectingStripe
                    ? "Abriendo Stripe..."
                    : stripeConfigured
                      ? "Revisar conexión Stripe"
                      : "Conectar Stripe"}
                </button>
              </div>

              <div className="rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-carbon)]">
                      ATH Móvil
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-gray-500)]">
                      Tus clientes enviarán el pago fuera de la app y te compartirán el recibo para verificarlo.
                    </p>
                  </div>
                  <span
                    className={[
                      "flex items-center gap-1.5 text-xs font-semibold",
                      athConfigured
                        ? "text-green-700"
                        : "text-amber-600",
                    ].join(" ")}
                  >
                    <span className={[
                      "inline-block h-2 w-2 rounded-full",
                      athConfigured ? "bg-green-500" : "bg-amber-400",
                    ].join(" ")} />
                    {athConfigured ? "Activo" : "Pendiente"}
                  </span>
                </div>
                <label className="mt-4 block">
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
              </div>

              {!stripeConfigured && !athConfigured ? (
                <div className="rounded-2xl border border-[var(--color-danger)] bg-red-50 px-4 py-3 text-xs leading-5 text-[var(--color-danger)]">
                  Debes configurar Stripe o ATH Móvil antes de poder publicar y cobrar en tu tienda.
                </div>
              ) : null}
            </div>

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

          {/* ── Contacto para compradores ── */}
          <Section
            label="Contacto para compradores"
            description="Tus clientes verán estos datos durante el checkout con ATH Móvil para coordinar contigo."
            Icon={UserIcon}
          >
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Teléfono de contacto
                </span>
                <input
                  type="tel"
                  value={formState.contactPhone}
                  placeholder="787-000-0000"
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, contactPhone: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  WhatsApp
                </span>
                <input
                  type="tel"
                  value={formState.contactWhatsapp}
                  placeholder="787-000-0000"
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, contactWhatsapp: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Instagram
                </span>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-gray-500)]">@</span>
                  <input
                    type="text"
                    value={formState.contactInstagram}
                    placeholder="tu_tienda"
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, contactInstagram: e.target.value.replace(/^@/, "") }))
                    }
                    className="w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white py-3 pl-8 pr-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Facebook
                </span>
                <input
                  type="text"
                  value={formState.contactFacebook}
                  placeholder="Nombre o enlace de página"
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, contactFacebook: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </label>
              <p className="text-xs leading-5 text-[var(--color-gray-500)]">
                Deja en blanco los campos que no uses. Solo se mostrarán los que completes.
              </p>
            </div>
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
            label="Políticas opcionales"
            description="Tu tienda ya incluye políticas generales activas. Solo entra aquí si necesitas personalizarlas para tu negocio."
            Icon={ShieldCheckIcon}
          >
            {/* Reassurance banner */}
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--vendor-card-border)] bg-white px-4 py-3.5">
              <div className="shrink-0 text-green-600">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-carbon)]">
                  Políticas por defecto activas
                </p>
                <p className="mt-0.5 text-xs leading-4 text-[var(--color-gray-500)]">
                  Tus clientes ya pueden ver estas políticas en tu tienda y durante el checkout.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPolicyEditorOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-4 py-3 text-left transition hover:bg-[var(--color-gray-100,#f9fafb)]"
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-[var(--color-gray-500)]">
                  <DocumentIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-carbon)]">
                    Personalizar políticas
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-[var(--color-gray-500)]">
                    Edita el texto solo si tu negocio necesita condiciones distintas.
                  </p>
                </div>
              </div>
              <ChevronDownIcon
                className={[
                  "h-4 w-4 text-[var(--color-gray-500)] transition-transform",
                  isPolicyEditorOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {isPolicyEditorOpen && (
              <>
                <div className="mt-5 space-y-2.5">
                  {POLICY_TYPES.map((policyType) => {
                    const isExpanded =
                      selectedPolicyType === policyType && expandedPolicyCard === policyType;
                    const draft = policyDrafts[policyType];
                    const currentPolicy = policyData?.currentPolicies[policyType];
                    const isPublished = Boolean(currentPolicy?.id);
                    const version = currentPolicy?.versionNumber ?? 0;
                    const isDirty = isPolicyDraftDirty(policyType, draft, policyData);

                    return (
                      <div
                        key={policyType}
                        className={[
                          "overflow-hidden rounded-2xl border transition-all duration-200",
                          isExpanded
                            ? "border-[var(--color-brand)] shadow-[0_0_0_1px_var(--color-brand)]"
                            : "border-[var(--color-gray-200,#e5e7eb)]",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedPolicyCard(null);
                            } else {
                              setSelectedPolicyType(policyType);
                              setExpandedPolicyCard(policyType);
                            }
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-gray-100,#f9fafb)]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--color-carbon)]">
                                {POLICY_TYPE_LABELS[policyType]}
                              </span>
                              {isPublished && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700">
                                  <CheckIcon className="h-2.5 w-2.5" />
                                  {version > 1 ? `v${version}` : "Activa"}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs leading-4 text-[var(--color-gray-500)]">
                              {POLICY_TYPE_DESCRIPTIONS[policyType]}
                            </p>
                          </div>
                          <div className="shrink-0 text-[var(--color-gray-500)]">
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 rotate-180 transition-transform" />
                            ) : (
                              <PencilIcon className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100,#f9fafb)] px-4 py-4">
                            <div className="space-y-3">
                              {(templatesByType.get(policyType) ?? []).length > 0 && (
                                <div className="flex items-end gap-2">
                                  <label className="block flex-1">
                                    <span className="text-xs font-semibold text-[var(--color-carbon)]">
                                      Plantilla
                                    </span>
                                    <select
                                      value={draft.templateId ?? ""}
                                      onChange={(e) =>
                                        setPolicyDrafts((current) => ({
                                          ...current,
                                          [policyType]: {
                                            ...current[policyType],
                                            templateId: e.target.value || null,
                                            accepted: false,
                                          },
                                        }))
                                      }
                                      className="mt-1 w-full appearance-none rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-2.5 text-xs outline-none"
                                    >
                                      <option value="">Seleccionar plantilla</option>
                                      {(templatesByType.get(policyType) ?? []).map((template) => (
                                        <option key={template.id} value={template.id}>
                                          {template.title} (v{template.version})
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const d = policyDrafts[policyType];
                                      if (!d.templateId) return;
                                      const template = (templatesByType.get(policyType) ?? []).find(
                                        (item) => item.id === d.templateId,
                                      );
                                      if (!template) return;
                                      setPolicyDrafts((current) => ({
                                        ...current,
                                        [policyType]: {
                                          ...current[policyType],
                                          title: template.title,
                                          body: template.bodyTemplate.replace(/\\n/g, "\n"),
                                          accepted: false,
                                        },
                                      }));
                                    }}
                                    className="shrink-0 rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)]"
                                  >
                                    Aplicar
                                  </button>
                                </div>
                              )}

                              <label className="block">
                                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                                  Título
                                </span>
                                <input
                                  type="text"
                                  value={draft.title}
                                  onChange={(e) =>
                                    setPolicyDrafts((current) => ({
                                      ...current,
                                      [policyType]: {
                                        ...current[policyType],
                                        title: e.target.value,
                                        accepted: false,
                                      },
                                    }))
                                  }
                                  className="mt-1 w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                                />
                              </label>

                              <label className="block">
                                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                                  Texto de la política
                                </span>
                                <textarea
                                  value={draft.body}
                                  onChange={(e) =>
                                    setPolicyDrafts((current) => ({
                                      ...current,
                                      [policyType]: {
                                        ...current[policyType],
                                        body: e.target.value,
                                        accepted: false,
                                      },
                                    }))
                                  }
                                  rows={8}
                                  className="mt-1 w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
                                />
                              </label>

                              {isDirty ? (
                                <>
                                  <label className="flex items-start gap-2.5 rounded-xl bg-white p-3 text-xs text-[var(--color-carbon)]">
                                    <input
                                      type="checkbox"
                                      checked={draft.accepted}
                                      onChange={(e) =>
                                        setPolicyDrafts((current) => ({
                                          ...current,
                                          [policyType]: {
                                            ...current[policyType],
                                            accepted: e.target.checked,
                                          },
                                        }))
                                      }
                                      className="mt-0.5 shrink-0"
                                    />
                                    <span className="leading-4">
                                      Confirmo que esta política es precisa y cumple con las leyes aplicables a mi negocio.
                                    </span>
                                  </label>

                                  <button
                                    type="button"
                                    disabled={isPublishingPolicy || !draft.accepted}
                                    onClick={() => {
                                      setSelectedPolicyType(policyType);
                                      void handlePublishPolicy();
                                    }}
                                    className="w-full rounded-full bg-[var(--color-carbon)] py-2.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-40"
                                  >
                                    {isPublishingPolicy && selectedPolicyType === policyType
                                      ? "Guardando..."
                                      : "Publicar cambios"}
                                  </button>
                                </>
                              ) : (
                                <p className="rounded-xl bg-white px-3 py-3 text-xs leading-5 text-[var(--color-gray-500)]">
                                  Solo necesitas aceptar legalmente cuando cambias el texto de esta política.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {policyData?.latestAcceptance && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-gray-500)]">
                    <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                    <p>
                      Última aceptación:{" "}
                      {new Date(policyData.latestAcceptance.acceptedAt).toLocaleString("es-PR")}
                    </p>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* ── Estado de tienda ── */}
          <Section
            label="Estado de tienda"
            description="Revisa si tu tienda está activa o qué te falta para que se publique automáticamente."
            Icon={SettingsIcon}
          >
            {/* Current status badge */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 text-[var(--color-carbon)]">
                  <InfoIcon className="h-5 w-5" />
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
                  "flex items-center gap-1.5 text-sm font-semibold",
                  STATUS_TEXT_STYLE[shopStatus ?? ""] ?? "text-[var(--color-gray-500)]",
                ].join(" ")}
              >
                <span className={[
                  "inline-block h-2 w-2 rounded-full",
                  STATUS_DOT_STYLE[shopStatus ?? ""] ?? "bg-[var(--color-gray-500)]",
                ].join(" ")} />
                {STATUS_LABELS[shopStatus ?? ""] ?? shopStatus ?? "—"}
              </span>
            </div>

            {/* Blocking reasons checklist */}
            {blockingReasons.length > 0 && (
              <div className="mb-4 rounded-2xl border border-[var(--vendor-card-border)] border-l-[3px] border-l-[var(--color-danger)] bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--color-danger)]">
                  Para activarla automáticamente:
                </p>
                <ul className="space-y-2">
                  {blockingReasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-sm leading-5 text-[var(--color-danger)]">
                      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {shopStatus === "draft" && (
              blockingReasons.length > 0 ? (
                <p className="text-sm leading-6 text-[var(--color-gray-500)]">
                  Completa los puntos de arriba y activaremos tu tienda automáticamente.
                </p>
              ) : (
                <p className="text-sm leading-6 text-[var(--color-gray-500)]">
                  Tu tienda ya está lista. La estamos activando ahora mismo.
                </p>
              )
            )}

            {shopStatus === "paused" && (
              <p className="mb-4 text-sm leading-6 text-[var(--color-gray-500)]">
                Tu tienda está pausada por decisión tuya. Reactívala cuando quieras.
              </p>
            )}

            {isActive ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleStatusUpdate("paused")}
                  className="flex-1 rounded-full border border-[var(--color-gray-200,#e5e7eb)] py-3 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-60"
                >
                  Pausar tienda
                </button>
              </div>
            ) : shopStatus === "paused" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={isSaving || blockingReasons.length > 0}
                  onClick={() => void handleStatusUpdate("active")}
                  className="flex-1 rounded-full bg-[var(--color-carbon)] py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
                >
                  Reactivar tienda
                </button>
              </div>
            ) : null}
          </Section>
        </>
      )}
    </VendorPageShell>
  );
}
