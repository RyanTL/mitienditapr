export const POLICY_TYPES = ["terms", "shipping", "refund", "privacy"] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export type PolicyCompletionStatus = "completed" | "recommended" | "required";

export type PolicyTemplate = {
  id: string;
  policyType: PolicyType;
  locale: string;
  title: string;
  bodyTemplate: string;
  version: number;
};

export type ShopPolicyVersion = {
  id: string;
  shopId: string;
  policyType: PolicyType;
  locale: string;
  title: string;
  body: string;
  sourceTemplateId: string | null;
  versionNumber: number;
  isCurrent: boolean;
  publishedAt: string;
  publishedBy: string;
};

export type VendorPolicyAcceptance = {
  id: string;
  shopId: string;
  acceptedByProfileId: string;
  acceptedAt: string;
  acceptanceScope: "publish" | "update";
  termsVersionId: string;
  shippingVersionId: string;
  refundVersionId: string | null;
  privacyVersionId: string | null;
};

export type VendorPolicyCompletion = {
  terms: PolicyCompletionStatus;
  shipping: PolicyCompletionStatus;
  refund: PolicyCompletionStatus;
  privacy: PolicyCompletionStatus;
  requiredReady: boolean;
};

export type VendorShopPoliciesResponse = {
  locale: string;
  currentPolicies: Partial<Record<PolicyType, ShopPolicyVersion | null>>;
  completion: VendorPolicyCompletion;
  latestAcceptance: VendorPolicyAcceptance | null;
};

export type VendorPolicyPublishResponse = VendorShopPoliciesResponse & {
  publishedPolicy: Pick<ShopPolicyVersion, "id" | "policyType">;
  acceptancePending: boolean;
};

export type PublicShopPoliciesResponse = {
  shopId: string;
  shopSlug: string;
  vendorName: string;
  requiredPolicyVersionIds: {
    terms: string;
    shipping: string;
  } | null;
  policies: Partial<Record<PolicyType, ShopPolicyVersion | null>>;
};
