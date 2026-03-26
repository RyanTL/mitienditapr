import type { PolicyType } from "@/lib/policies/types";

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  terms: "Términos y condiciones",
  shipping: "Política de envío",
  refund: "Política de reembolso",
  privacy: "Política de privacidad",
};

export const REQUIRED_POLICY_TYPES: PolicyType[] = ["terms", "shipping"];

export const POLICY_MIN_LENGTH: Record<PolicyType, number> = {
  terms: 120,
  shipping: 80,
  refund: 60,
  privacy: 60,
};

export const POLICY_MAX_LENGTH = 12_000;

export const POLICY_LOCALE = "es-PR";

export const DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT =
  "Confirmo que estas políticas son precisas, cumplen con la ley aplicable para mi negocio y acepto que soy responsable como vendedor de los productos y su cumplimiento.";
