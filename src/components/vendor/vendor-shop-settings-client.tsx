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
  LinkIcon,
  SettingsIcon,
  ShieldCheckIcon,
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
  createVendorBillingPortalSession,
  fetchVendorShopSettings,
  uploadVendorImage,
  updateVendorShopSettings,
} from "@/lib/vendor/client";
import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";
import type { VendorShopStatus } from "@/lib/vendor/constants";
import { toNumber } from "@/lib/utils";
import type { VendorShopSettingsResponse } from "@/lib/vendor/types";

type ShopResponse = VendorShopSettingsResponse;

/** Short debounce: fewer round-trips than typing every keystroke, still feels instant. */
const AUTOSAVE_DEBOUNCE_MS = 450;

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

function isShopFormDirty(formState: ShopSettingsFormState, statusData: ShopResponse | null) {
  if (!statusData?.shop) return false;
  const saved = mapFormStateFromResponse(statusData);
  const shipForm = toNumber(formState.shippingFlatFeeUsd, 0);
  const shipSaved = toNumber(saved.shippingFlatFeeUsd, 0);
  return (
    formState.vendorName !== saved.vendorName ||
    formState.slug !== saved.slug ||
    formState.description !== saved.description ||
    formState.logoUrl !== saved.logoUrl ||
    shipForm !== shipSaved ||
    formState.offersPickup !== saved.offersPickup ||
    formState.athMovilPhone !== saved.athMovilPhone ||
    formState.contactPhone !== saved.contactPhone ||
    formState.contactInstagram !== saved.contactInstagram ||
    formState.contactFacebook !== saved.contactFacebook ||
    formState.contactWhatsapp !== saved.contactWhatsapp
  );
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

// ─── Section wrapper (compact settings card) ─────────────────────────────────

type SectionIconComponent = (props: ComponentPropsWithoutRef<"svg">) => ReactNode;

function SettingsSection({
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
    <div className="rounded-2xl border border-[var(--color-gray)] bg-white p-4 shadow-[0_2px_12px_var(--shadow-black-003)]">
      <div className="mb-3 flex items-start gap-2.5">
        <div className="shrink-0 text-[var(--color-carbon)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-carbon)]">{label}</h2>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--color-gray-500)]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

const fieldInputClass =
  "mt-1 w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]";

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
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const templatesByType = useMemo(() => {
    return buildTemplatesByType(policyTemplates);
  }, [policyTemplates]);

  const applyFetchedBundle = useCallback(
    (
      shopResponse: ShopResponse,
      templates: PolicyTemplate[],
      policiesResponse: VendorShopPoliciesResponse,
    ) => {
      setStatusData(shopResponse);
      setFormState(mapFormStateFromResponse(shopResponse));
      setPolicyTemplates(templates);
      setPolicyData(policiesResponse);
      setPolicyDrafts(buildPolicyDrafts(policiesResponse, templates));
    },
    [],
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
      applyFetchedBundle(shopResponse, templatesResponse.templates, policiesResponse);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar configuración.");
    } finally {
      setIsLoading(false);
    }
  }, [applyFetchedBundle]);

  useEffect(() => {
    if (hasInitialData) {
      return;
    }

    void loadSettings();
  }, [hasInitialData, loadSettings]);

  const shopFormDirty = useMemo(
    () => isShopFormDirty(formState, statusData),
    [formState, statusData],
  );

  const policySaveTargets = useMemo(() => {
    return POLICY_TYPES.filter((policyType) => {
      const draft = policyDrafts[policyType];
      return isPolicyDraftDirty(policyType, draft, policyData) && draft.accepted;
    });
  }, [policyDrafts, policyData]);

  const hasBlockingPolicyEdits = useMemo(() => {
    return POLICY_TYPES.some((policyType) => {
      const draft = policyDrafts[policyType];
      return isPolicyDraftDirty(policyType, draft, policyData) && !draft.accepted;
    });
  }, [policyDrafts, policyData]);

  const hasAnythingToSave = shopFormDirty || policySaveTargets.length > 0;
  const canSaveAll = hasAnythingToSave && !hasBlockingPolicyEdits;

  const handleSaveAll = useCallback(async () => {
    if (!canSaveAll) return;
    setIsSavingSettings(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const shopPayload = {
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
      };

      const saveShop = shopFormDirty
        ? updateVendorShopSettings(shopPayload).then((response) => {
            setStatusData((prev) => {
              if (!prev) return prev;
              const next: ShopResponse = {
                ...prev,
                shop: response.shop,
                checks: response.checks,
              };
              setFormState(mapFormStateFromResponse(next));
              return next;
            });
          })
        : Promise.resolve();

      const savePolicies =
        policySaveTargets.length > 0
          ? Promise.all(
              policySaveTargets.map((policyType) => {
                const draft = policyDrafts[policyType];
                return publishVendorShopPolicy(policyType, {
                  title: draft.title,
                  body: draft.body,
                  templateId: draft.templateId,
                  acceptanceScope: "update",
                  acceptanceText: DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
                  accepted: draft.accepted,
                });
              }),
            ).then(async () => {
              const policiesResponse = await fetchVendorShopPolicies();
              setPolicyData(policiesResponse);
              setPolicyDrafts(buildPolicyDrafts(policiesResponse, policyTemplates));
              setExpandedPolicyCard(null);
            })
          : Promise.resolve();

      await Promise.all([saveShop, savePolicies]);

      setFeedbackMessage("Cambios guardados.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron guardar los cambios.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  }, [
    canSaveAll,
    formState,
    policyDrafts,
    policySaveTargets,
    policyTemplates,
    shopFormDirty,
  ]);

  const handleSaveAllRef = useRef(handleSaveAll);
  handleSaveAllRef.current = handleSaveAll;

  useEffect(() => {
    if (isLoading || !canSaveAll || isSavingSettings || isUpdatingStatus || isUploadingLogo) {
      return;
    }
    const id = window.setTimeout(() => {
      void handleSaveAllRef.current();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [
    canSaveAll,
    formState,
    policyDrafts,
    isLoading,
    isSavingSettings,
    isUpdatingStatus,
    isUploadingLogo,
  ]);

  const handleStatusUpdate = useCallback(async (nextStatus: VendorShopStatus) => {
    setIsUpdatingStatus(true);
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
      setIsUpdatingStatus(false);
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

  const handleOpenBillingPortal = useCallback(async () => {
    setIsOpeningBillingPortal(true);
    setErrorMessage(null);
    try {
      const response = await createVendorBillingPortalSession();
      window.location.assign(response.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo abrir el portal de facturación.",
      );
      setIsOpeningBillingPortal(false);
    }
  }, []);

  const subscription = statusData?.subscription ?? null;

  return (
    <VendorPageShell
      title="Configuración de tienda"
      subtitle="Perfil público, envíos, cobros y políticas. Los cambios se guardan solos al poco tiempo de dejar de editar."
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
      {!isLoading && hasBlockingPolicyEdits ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-snug text-amber-900">
          Marca la casilla legal en cada política que editaste para poder guardarla automáticamente.
        </p>
      ) : null}
      {!isLoading && isSavingSettings ? (
        <p className="text-xs font-medium text-[var(--color-gray-500)]">Guardando…</p>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4 pb-6 md:pb-10">
          {/* ── Membresía ── */}
          <SettingsSection
            label="Membresía"
            description="Suscripción al Plan Vendedor: cancelar, renovación automática y facturas."
            Icon={UserIcon}
          >
            {isVendorBillingBypassEnabled ? (
              <p className="text-xs leading-relaxed text-[var(--color-gray-500)]">
                En modo prueba la facturación está omitida. El portal de administración de pagos no
                está disponible.
              </p>
            ) : !subscription ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-gray-500)]">
                  Aún no hay una suscripción registrada para esta tienda.
                </p>
                <a
                  href="/vendedor/suscripcion"
                  className="inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                >
                  Ver planes
                </a>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[var(--color-gray-500)]">
                <p>
                  <span className="font-semibold text-[var(--color-carbon)]">Estado: </span>
                  {subscription.status}
                  {subscription.cancel_at_period_end ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Renovación desactivada al fin del periodo
                    </span>
                  ) : null}
                </p>
                <p>
                  <span className="font-semibold text-[var(--color-carbon)]">Origen: </span>
                  {subscription.provider === "stripe"
                    ? "Stripe (tarjeta)"
                    : subscription.provider === "manual_code"
                      ? "Código de acceso"
                      : subscription.provider}
                </p>
                {subscription.current_period_end ? (
                  <p>
                    <span className="font-semibold text-[var(--color-carbon)]">
                      Próxima fecha clave:{" "}
                    </span>
                    {new Date(subscription.current_period_end).toLocaleDateString("es-PR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
                {subscription.provider === "stripe" &&
                subscription.stripe_customer_id?.startsWith("cus_") ? (
                  <button
                    type="button"
                    disabled={isOpeningBillingPortal}
                    onClick={() => void handleOpenBillingPortal()}
                    className="w-full rounded-full bg-[var(--color-carbon)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-6"
                  >
                    {isOpeningBillingPortal
                      ? "Abriendo portal…"
                      : "Gestionar facturación y renovación"}
                  </button>
                ) : subscription.provider === "manual_code" ? (
                  <p className="leading-relaxed">
                    Tu acceso fue otorgado con un código. Para cambios de membresía, contacta a
                    soporte.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    No hay un cliente de Stripe asociado. Suscríbete desde la página de suscripción
                    para gestionar pagos en línea.
                  </p>
                )}
              </div>
            )}
          </SettingsSection>

          {/* ── Información de tienda ── */}
          <SettingsSection
            label="Tu tienda"
            description="Nombre, enlace y descripción que ven tus clientes."
            Icon={LinkIcon}
          >
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-gray-100)] text-[var(--color-gray-500)] transition hover:opacity-80"
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
                  <ImageIcon className="h-6 w-6" />
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
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--color-carbon)]">Logo</p>
                <p className="mt-0.5 text-xs leading-snug text-[var(--color-gray-500)]">
                  Toca para subir o cambiar. El logo se aplica en el guardado automático.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  Nombre de tienda
                </span>
                <input
                  type="text"
                  value={formState.vendorName}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, vendorName: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">URL</span>
                <p className="mt-0.5 text-[11px] text-[var(--color-gray-500)]">mitiendita.pr/</p>
                <input
                  type="text"
                  value={formState.slug}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, slug: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  Descripción
                </span>
                <textarea
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, description: e.target.value }))
                  }
                  rows={2}
                  className={`${fieldInputClass} leading-relaxed`}
                />
              </label>
            </div>
          </SettingsSection>

          {/* ── Envíos y recogida ── */}
          <SettingsSection
            label="Envíos y recogida"
            description="Configura el costo base de envío y si ofreces recogido en persona."
            Icon={TruckIcon}
          >
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  Tarifa fija de envío (USD)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formState.shippingFlatFeeUsd}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, shippingFlatFeeUsd: e.target.value }))
                  }
                  className={fieldInputClass}
                />
                <p className="mt-1 text-[11px] leading-snug text-[var(--color-gray-500)]">
                  Se muestra en el checkout como envío base.
                </p>
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={formState.offersPickup}
                onClick={() =>
                  setFormState((s) => ({ ...s, offersPickup: !s.offersPickup }))
                }
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[var(--color-carbon)]">
                    Recogido en persona
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-gray-500)]">
                    Permite pickup o entrega coordinada con el cliente.
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
          </SettingsSection>

          {/* ── Métodos de pago ── */}
          <SettingsSection
            label="Cobros"
            description="Tarjeta (Stripe) y ATH Móvil. El número ATH se guarda solo al editar."
            Icon={AthMovilIcon}
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-carbon)]">
                      Stripe (tarjeta)
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-gray-500)]">
                      Acción inmediata: se abre Stripe para conectar o revisar tu cuenta.
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
                  className="mt-3 w-full rounded-full border border-[var(--color-carbon)] py-2 text-xs font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100,#f9fafb)] disabled:opacity-60 sm:w-auto sm:px-4"
                >
                  {isConnectingStripe
                    ? "Abriendo Stripe..."
                    : stripeConfigured
                      ? "Revisar conexión Stripe"
                      : "Conectar Stripe"}
                </button>
              </div>

              <div className="rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-carbon)]">ATH Móvil</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-gray-500)]">
                      El cliente paga fuera de la app y sube el recibo; tú lo verificas.
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
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-[var(--color-carbon)]">
                    Número ATH Móvil
                  </span>
                  <input
                    type="tel"
                    value={formState.athMovilPhone}
                    placeholder="787-555-0100"
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, athMovilPhone: e.target.value }))
                    }
                    className={fieldInputClass}
                  />
                  <p className="mt-1 text-[11px] text-[var(--color-gray-500)]">
                    Opcional. En blanco si no usas ATH.
                  </p>
                </label>
              </div>

              {!stripeConfigured && !athConfigured ? (
                <div className="rounded-xl border border-[var(--color-danger)] bg-red-50 px-3 py-2.5 text-[11px] leading-snug text-[var(--color-danger)]">
                  Configura Stripe o ATH Móvil para publicar y cobrar.
                </div>
              ) : null}
            </div>
          </SettingsSection>

          {/* ── Contacto para compradores ── */}
          <SettingsSection
            label="Contacto en checkout"
            description="Datos opcionales que ves en el flujo ATH para coordinar."
            Icon={UserIcon}
          >
            <div className="space-y-2.5">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  Teléfono
                </span>
                <input
                  type="tel"
                  value={formState.contactPhone}
                  placeholder="787-000-0000"
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, contactPhone: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  WhatsApp
                </span>
                <input
                  type="tel"
                  value={formState.contactWhatsapp}
                  placeholder="787-000-0000"
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, contactWhatsapp: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  Instagram
                </span>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-gray-500)]">@</span>
                  <input
                    type="text"
                    value={formState.contactInstagram}
                    placeholder="tu_tienda"
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, contactInstagram: e.target.value.replace(/^@/, "") }))
                    }
                    className={`${fieldInputClass} pl-7`}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--color-carbon)]">
                  Facebook
                </span>
                <input
                  type="text"
                  value={formState.contactFacebook}
                  placeholder="Página o enlace"
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, contactFacebook: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </label>
              <p className="text-[11px] leading-snug text-[var(--color-gray-500)]">
                Solo se muestran los campos que llenes.
              </p>
            </div>
          </SettingsSection>

          {/* ── Políticas ── */}
          <SettingsSection
            label="Políticas"
            description="Ya tienes textos por defecto. Edita solo si hace falta; se publican solos tras la confirmación legal."
            Icon={ShieldCheckIcon}
          >
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--vendor-card-border)] bg-white px-3 py-2.5">
              <div className="shrink-0 text-green-600">
                <ShieldCheckIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--color-carbon)]">
                  Políticas por defecto activas
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-gray-500)]">
                  Visibles en tu tienda y en el checkout.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPolicyEditorOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-white px-3 py-2.5 text-left transition hover:bg-[var(--color-gray-100,#f9fafb)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-[var(--color-gray-500)]">
                  <DocumentIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-carbon)]">
                    Personalizar textos
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-gray-500)]">
                    Avanzado: plantillas y borradores.
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
                                  <label className="flex items-start gap-2.5 rounded-xl bg-white p-3 text-[11px] text-[var(--color-carbon)]">
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
                                    <span className="leading-snug">
                                      Confirmo que esta política es precisa y cumple con las leyes aplicables a mi negocio.
                                    </span>
                                  </label>
                                  <p className="rounded-xl bg-white px-3 py-2 text-[11px] leading-snug text-[var(--color-gray-500)]">
                                    {draft.accepted
                                      ? "Se publicará automáticamente en unos segundos junto con el resto de los cambios."
                                      : "Marca la casilla para incluir esta política en el guardado automático."}
                                  </p>
                                </>
                              ) : (
                                <p className="rounded-xl bg-white px-3 py-2.5 text-[11px] leading-snug text-[var(--color-gray-500)]">
                                  La confirmación legal solo aplica cuando modificas el texto.
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
          </SettingsSection>

          {/* ── Estado de tienda ── */}
          <SettingsSection
            label="Estado y visibilidad"
            description="Borrador, activa o pausada. Las acciones de pausa aplican al momento."
            Icon={SettingsIcon}
          >
            <div className="mb-3 flex items-center justify-between rounded-xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 text-[var(--color-carbon)]">
                  <InfoIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-carbon)]">Estado</p>
                  <p className="text-[11px] leading-snug text-[var(--color-gray-500)]">
                    Visible para compradores cuando está activa.
                  </p>
                </div>
              </div>
              <span
                className={[
                  "flex items-center gap-1.5 text-xs font-semibold",
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

            {blockingReasons.length > 0 && (
              <div className="mb-3 rounded-xl border border-[var(--vendor-card-border)] border-l-[3px] border-l-[var(--color-danger)] bg-white p-3">
                <p className="mb-1.5 text-xs font-semibold text-[var(--color-danger)]">
                  Para activarla automáticamente:
                </p>
                <ul className="space-y-1.5">
                  {blockingReasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-xs leading-snug text-[var(--color-danger)]">
                      <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {shopStatus === "draft" && (
              blockingReasons.length > 0 ? (
                <p className="text-xs leading-snug text-[var(--color-gray-500)]">
                  Completa lo anterior y activaremos tu tienda automáticamente.
                </p>
              ) : (
                <p className="text-xs leading-snug text-[var(--color-gray-500)]">
                  Tu tienda está lista; la estamos activando.
                </p>
              )
            )}

            {shopStatus === "paused" && (
              <p className="mb-3 text-xs leading-snug text-[var(--color-gray-500)]">
                Pausada por ti. Reactívala cuando quieras.
              </p>
            )}

            {isActive || shopStatus === "paused" ? (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                Acciones inmediatas
              </p>
            ) : null}

            {isActive ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={isUpdatingStatus || isSavingSettings}
                  onClick={() => void handleStatusUpdate("paused")}
                  className="flex-1 rounded-full border border-[var(--color-gray-200,#e5e7eb)] py-2.5 text-xs font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-60"
                >
                  {isUpdatingStatus ? "Aplicando..." : "Pausar tienda"}
                </button>
              </div>
            ) : shopStatus === "paused" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={isUpdatingStatus || isSavingSettings || blockingReasons.length > 0}
                  onClick={() => void handleStatusUpdate("active")}
                  className="flex-1 rounded-full bg-[var(--color-carbon)] py-2.5 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
                >
                  {isUpdatingStatus ? "Aplicando..." : "Reactivar tienda"}
                </button>
              </div>
            ) : null}
          </SettingsSection>
          </div>
        </>
      )}
    </VendorPageShell>
  );
}
