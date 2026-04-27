"use client";

import Image from "next/image";
import Link from "next/link";
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
  publishVendorShop,
  uploadVendorImage,
  updateVendorShopSettings,
} from "@/lib/vendor/client";
import { isStripeConnectAccountId } from "@/lib/stripe-connect";
import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";
import type { VendorShopStatus } from "@/lib/vendor/constants";
import { toNumber } from "@/lib/utils";
import type { VendorShopSettingsResponse } from "@/lib/vendor/types";

/** Stable accordion category ids. Anchors like `#tu-tienda` and `#cobros` resolve to these. */
const CATEGORY_IDS = [
  "membresia",
  "tu-tienda",
  "envios",
  "cobros",
  "contacto",
  "politicas",
  "estado",
] as const;
type CategoryId = (typeof CATEGORY_IDS)[number];

function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

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

// ─── Section wrapper (collapsible settings category card) ────────────────────

type SectionIconComponent = (props: ComponentPropsWithoutRef<"svg">) => ReactNode;

function SettingsSection({
  label,
  description,
  Icon,
  children,
  sectionId,
  open,
  onToggle,
}: {
  label: string;
  description: string;
  Icon: SectionIconComponent;
  children: ReactNode;
  /** Optional DOM id so in-page anchors (e.g. `#cobros`) can scroll to this section. */
  sectionId?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const headerId = sectionId ? `${sectionId}-header` : undefined;
  const panelId = sectionId ? `${sectionId}-panel` : undefined;

  return (
    <div
      id={sectionId}
      className={[
        "scroll-mt-20 overflow-hidden rounded-2xl border bg-white shadow-[0_2px_12px_var(--shadow-black-003)] transition-colors",
        open
          ? "border-[var(--color-brand)]/30"
          : "border-[var(--color-gray)]",
      ].join(" ")}
    >
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-gray-100,#f9fafb)] min-h-14"
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
            open
              ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
              : "bg-[var(--color-gray-100,#f9fafb)] text-[var(--color-carbon)]",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[var(--color-carbon)]">{label}</span>
        </span>
        <ChevronDownIcon
          className={[
            "h-4 w-4 shrink-0 text-[var(--color-gray-500)] transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        aria-hidden={!open}
        data-open={open ? "true" : "false"}
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-out data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100"
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--color-gray-200,#e5e7eb)] px-4 pb-4 pt-3">
            <p className="mb-3 text-xs leading-snug text-[var(--color-gray-500)]">
              {description}
            </p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Publish readiness card (top-of-page checklist) ──────────────────────────

type ReadinessRequirement = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  action?: { label: string; href: string; external?: boolean };
};

function ReadinessRow({ requirement }: { requirement: ReadinessRequirement }) {
  const { title, description, done, action } = requirement;
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className={[
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
          done
            ? "border-green-500 bg-green-500 text-white"
            : "border-[var(--color-gray-300,#d1d5db)] bg-white text-[var(--color-gray-500)]",
        ].join(" ")}
      >
        {done ? <CheckIcon className="h-3.5 w-3.5" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={[
            "text-sm font-semibold",
            done ? "text-[var(--color-gray-500)] line-through" : "text-[var(--color-carbon)]",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-[var(--color-gray-500)]">{description}</p>
        {!done && action ? (
          <Link
            href={action.href}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-carbon)] px-3.5 py-1.5 text-[11px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {action.label}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function PublishReadinessCard({
  requirements,
  canPublish,
  isPublishing,
  onPublish,
  publishError,
}: {
  requirements: ReadinessRequirement[];
  canPublish: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  publishError: string | null;
}) {
  const pendingCount = requirements.filter((requirement) => !requirement.done).length;

  return (
    <div className="rounded-2xl border border-[var(--color-gray)] bg-white p-5 shadow-[0_2px_12px_var(--shadow-black-003)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            canPublish ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          {canPublish ? <CheckIcon className="h-5 w-5" /> : <InfoIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[var(--color-carbon)]">
            {canPublish ? "Todo listo para publicar" : "Pasos para publicar tu tienda"}
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-[var(--color-gray-500)]">
            {canPublish
              ? "Ya cumples con todos los requisitos. Publica tu tienda para empezar a vender."
              : pendingCount === 1
                ? "Te falta 1 paso para publicar tu tienda."
                : `Te faltan ${pendingCount} pasos para publicar tu tienda.`}
          </p>
        </div>
      </div>

      {!canPublish ? (
        <ul className="mt-4 divide-y divide-[var(--color-gray-200,#e5e7eb)]">
          {requirements.map((requirement) => (
            <ReadinessRow key={requirement.id} requirement={requirement} />
          ))}
        </ul>
      ) : null}

      {publishError ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-red-50 px-3 py-2.5 text-xs leading-snug text-[var(--color-danger)]">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{publishError}</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canPublish || isPublishing}
        onClick={onPublish}
        className={[
          "mt-4 w-full rounded-full px-5 py-3 text-sm font-bold transition-transform active:scale-[0.98]",
          canPublish
            ? "bg-[var(--color-brand)] text-white hover:opacity-90"
            : "cursor-not-allowed bg-[var(--color-gray-100)] text-[var(--color-gray-500)]",
          isPublishing ? "opacity-60" : "",
        ].join(" ")}
      >
        {isPublishing
          ? "Publicando…"
          : canPublish
            ? "Publicar tienda"
            : "Publicar tienda"}
      </button>
      {!canPublish ? (
        <p className="mt-2 text-center text-[11px] leading-snug text-[var(--color-gray-500)]">
          Completa los pasos de arriba para desbloquear el botón.
        </p>
      ) : null}
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
  /** Surfaced inline inside the readiness card so the vendor sees it next to the publish button. */
  const [publishError, setPublishError] = useState<string | null>(null);
  /** Single-focus accordion: only one settings category is expanded at a time. */
  const [openCategory, setOpenCategory] = useState<CategoryId | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = useCallback((id: CategoryId) => {
    setOpenCategory((current) => (current === id ? null : id));
  }, []);

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

  /**
   * Hash anchors used by the readiness card (`#tu-tienda`, `#cobros`) auto-open
   * the matching category and scroll it into view, so the vendor lands directly
   * on the editable fields instead of a still-collapsed header.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash || !isCategoryId(hash)) return;
      setOpenCategory(hash);
      requestAnimationFrame(() => {
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

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

  /** Policy drafts with unchecked legal box block policy publishes only — not tienda profile fields. */
  const canSavePolicies = policySaveTargets.length > 0 && !hasBlockingPolicyEdits;
  const canAutosave = shopFormDirty || canSavePolicies;

  const handleSaveAll = useCallback(async () => {
    if (!shopFormDirty && !canSavePolicies) return;
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

      const savePolicies = canSavePolicies
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
    canSavePolicies,
    formState,
    policyDrafts,
    policySaveTargets,
    policyTemplates,
    shopFormDirty,
  ]);

  const handleSaveAllRef = useRef(handleSaveAll);
  handleSaveAllRef.current = handleSaveAll;

  useEffect(() => {
    if (isLoading || !canAutosave || isSavingSettings || isUpdatingStatus || isUploadingLogo) {
      return;
    }
    const id = window.setTimeout(() => {
      void handleSaveAllRef.current();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [
    canAutosave,
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

  const handlePublishShop = useCallback(async () => {
    setIsUpdatingStatus(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    setPublishError(null);
    try {
      const publishResponse = await publishVendorShop();
      const refreshed = await fetchVendorShopSettings();
      setStatusData(refreshed);
      setFormState(mapFormStateFromResponse(refreshed));

      if (!publishResponse.published) {
        const firstReason = publishResponse.blockingReasons[0] ?? null;
        const fallback = firstReason ?? "No puedes publicar la tienda todavía.";
        setPublishError(fallback);
        return;
      }

      setFeedbackMessage("Tienda publicada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo publicar la tienda.";
      setErrorMessage(message);
      setPublishError(message);
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
      const logoUrl = result.url;
      const response = await updateVendorShopSettings({ logoUrl });
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
      setFeedbackMessage("Logo guardado en tu tienda.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo subir el logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }, []);

  const shopStatus = statusData?.shop?.status;
  const isActive = shopStatus === "active";
  const blockingReasons = statusData?.checks.blockingReasons ?? [];
  const stripeConfigured = isStripeConnectAccountId(statusData?.shop?.stripe_connect_account_id);
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

  const activeProductCount = statusData?.checks.activeProductCount ?? 0;
  const canPublish = statusData?.checks.canPublish ?? false;
  const needsBasics = blockingReasons.includes("Completa nombre y slug de la tienda.");
  const needsProduct = blockingReasons.includes("Debes publicar al menos 1 producto activo.");
  const needsPayments = blockingReasons.includes(
    "Configura Stripe o ATH Móvil para poder cobrar.",
  );
  const subscriptionExpiredReason = blockingReasons.find((reason) =>
    reason.startsWith("Tu acceso gratuito expiró"),
  );

  const readinessRequirements = useMemo<ReadinessRequirement[]>(() => {
    const items: ReadinessRequirement[] = [
      {
        id: "basics",
        title: "Información básica de la tienda",
        description: "Agrega el nombre y el enlace que verán tus clientes.",
        done: !needsBasics,
        action: { label: "Completar información", href: "#tu-tienda" },
      },
      {
        id: "product",
        title: "Lista tu primer producto",
        description:
          activeProductCount > 0
            ? `Tienes ${activeProductCount} ${activeProductCount === 1 ? "producto activo" : "productos activos"}.`
            : "Tu tienda necesita al menos 1 producto activo para publicarse.",
        done: !needsProduct,
        action: { label: "Listar producto", href: "/vendedor/productos" },
      },
      {
        id: "payments",
        title: "Método de cobro",
        description: "Conecta Stripe o ATH Móvil para poder recibir pagos.",
        done: !needsPayments,
        action: { label: "Configurar cobros", href: "#cobros" },
      },
    ];

    if (subscriptionExpiredReason) {
      items.push({
        id: "subscription",
        title: "Renueva tu acceso",
        description: subscriptionExpiredReason,
        done: false,
        action: { label: "Ver planes", href: "/vendedor/suscripcion" },
      });
    }

    return items;
  }, [
    needsBasics,
    needsProduct,
    needsPayments,
    activeProductCount,
    subscriptionExpiredReason,
  ]);

  const showReadinessCard = !isLoading && shopStatus !== "active";

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

      {showReadinessCard ? (
        <PublishReadinessCard
          requirements={readinessRequirements}
          canPublish={canPublish}
          isPublishing={isUpdatingStatus}
          onPublish={() => void handlePublishShop()}
          publishError={publishError}
        />
      ) : null}
      {!isLoading && hasBlockingPolicyEdits ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-snug text-amber-900">
          Marca la casilla legal en cada política que editaste para publicar ese cambio. El perfil de
          la tienda (nombre, logo, contacto, etc.) se puede guardar igual.
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
            sectionId="membresia"
            label="Membresía"
            description="Suscripción al Plan Vendedor: cancelar, renovación automática y facturas."
            Icon={UserIcon}
            open={openCategory === "membresia"}
            onToggle={() => toggleCategory("membresia")}
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
                <Link
                  href="/vendedor/suscripcion"
                  className="inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                >
                  Ver planes
                </Link>
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
                      Fecha de renovación:{" "}
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
            sectionId="tu-tienda"
            label="Tu tienda"
            description="Nombre, enlace y descripción que ven tus clientes."
            Icon={LinkIcon}
            open={openCategory === "tu-tienda"}
            onToggle={() => toggleCategory("tu-tienda")}
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
            sectionId="envios"
            label="Envíos y recogida"
            description="Configura el costo base de envío y si ofreces recogido en persona."
            Icon={TruckIcon}
            open={openCategory === "envios"}
            onToggle={() => toggleCategory("envios")}
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
            sectionId="cobros"
            label="Métodos de cobro"
            description="Tarjeta (Stripe) y ATH Móvil. El número ATH se guarda solo al editar."
            Icon={AthMovilIcon}
            open={openCategory === "cobros"}
            onToggle={() => toggleCategory("cobros")}
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

          {/* ── Contactos ── */}
          <SettingsSection
            sectionId="contacto"
            label="Contactos"
            description="Teléfono, WhatsApp y redes. Aparecen en el menú de la tienda y al pagar con ATH."
            Icon={UserIcon}
            open={openCategory === "contacto"}
            onToggle={() => toggleCategory("contacto")}
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
            sectionId="politicas"
            label="Políticas"
            description="Ya tienes textos por defecto. Edita solo si hace falta; se publican solos tras la confirmación legal."
            Icon={ShieldCheckIcon}
            open={openCategory === "politicas"}
            onToggle={() => toggleCategory("politicas")}
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
            sectionId="estado"
            label="Estado y visibilidad"
            description="Borrador, activa o pausada. Las acciones de pausa aplican al momento."
            Icon={SettingsIcon}
            open={openCategory === "estado"}
            onToggle={() => toggleCategory("estado")}
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

            {shopStatus === "draft" && blockingReasons.length > 0 && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-amber-900">
                <p>
                  Completa los pasos del checklist al inicio de esta página para
                  desbloquear la publicación.
                </p>
              </div>
            )}

            {shopStatus === "draft" && blockingReasons.length === 0 && (
              <p className="mb-3 text-xs leading-snug text-[var(--color-gray-500)]">
                Tu tienda está lista. Usa el botón de arriba o el de abajo para publicarla.
              </p>
            )}

            {shopStatus === "paused" && (
              <p className="mb-3 text-xs leading-snug text-[var(--color-gray-500)]">
                Pausada por ti. Reactívala cuando quieras.
              </p>
            )}

            {isActive || shopStatus === "paused" || shopStatus === "draft" ? (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                Acciones inmediatas
              </p>
            ) : null}

            {shopStatus === "draft" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    isUpdatingStatus || isSavingSettings || blockingReasons.length > 0
                  }
                  onClick={() => void handlePublishShop()}
                  className="flex-1 rounded-full bg-[var(--color-carbon)] py-2.5 text-xs font-semibold text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:bg-[var(--color-gray-100)] disabled:text-[var(--color-gray-500)] disabled:opacity-100"
                >
                  {isUpdatingStatus ? "Publicando..." : "Publicar tienda"}
                </button>
              </div>
            ) : isActive ? (
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
