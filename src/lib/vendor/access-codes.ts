import crypto from "node:crypto";

export type VendorAccessBenefitType = "free_months" | "lifetime_free";

export type VendorAccessCodeRow = {
  id: string;
  code_hash: string;
  label: string;
  is_active: boolean;
  max_redemptions: number | null;
  redeemed_count: number;
  benefit_type: VendorAccessBenefitType;
  benefit_months: number | null;
  expires_at: string | null;
};

export function normalizeAccessCode(rawCode: string) {
  return rawCode
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

export function hashAccessCode(normalizedCode: string) {
  return crypto.createHash("sha256").update(normalizedCode).digest("hex");
}

export function createPlainAccessCode() {
  const segmentA = crypto.randomBytes(3).toString("hex").toUpperCase();
  const segmentB = crypto.randomBytes(3).toString("hex").toUpperCase();
  const segmentC = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MTP-${segmentA}-${segmentB}-${segmentC}`;
}

export function isAccessCodeExpired(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= now.getTime();
}

export function calculateManualCodePeriodEnd(input: {
  benefitType: VendorAccessBenefitType;
  benefitMonths: number | null;
  now?: Date;
}) {
  const { benefitType, benefitMonths, now = new Date() } = input;
  if (benefitType === "lifetime_free") {
    return null;
  }

  const months = Math.max(1, benefitMonths ?? 1);
  const next = new Date(now);
  next.setMonth(next.getMonth() + months);
  return next.toISOString();
}
