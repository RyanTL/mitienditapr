import {
  POLICY_MAX_LENGTH,
  POLICY_MIN_LENGTH,
  POLICY_TYPE_LABELS,
} from "@/lib/policies/constants";
import type { PolicyType } from "@/lib/policies/types";

export function normalizePolicyBody(input: string) {
  return input.trim().replace(/\r\n/g, "\n");
}

export function containsUnresolvedTemplateTokens(body: string) {
  return body.includes("{{") || body.includes("}}");
}

export function validatePolicyBody(policyType: PolicyType, body: string) {
  const normalized = normalizePolicyBody(body);
  const minLength = POLICY_MIN_LENGTH[policyType];

  if (normalized.length < minLength) {
    return {
      ok: false as const,
      error: `${POLICY_TYPE_LABELS[policyType]} debe tener al menos ${minLength} caracteres.`,
    };
  }

  if (normalized.length > POLICY_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `${POLICY_TYPE_LABELS[policyType]} excede el maximo de ${POLICY_MAX_LENGTH} caracteres.`,
    };
  }

  if (containsUnresolvedTemplateTokens(normalized)) {
    return {
      ok: false as const,
      error: "Completa todos los campos de la plantilla antes de publicar.",
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}
