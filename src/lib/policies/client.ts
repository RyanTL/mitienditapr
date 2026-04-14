"use client";

import type {
  PolicyType,
  PublicShopPoliciesResponse,
  VendorPolicyPublishResponse,
  VendorShopPoliciesResponse,
} from "@/lib/policies/types";
import { fetchJson } from "@/lib/fetch-client";
import type { VendorPolicyTemplatesResponse } from "@/lib/vendor/types";

export function fetchVendorPolicyTemplates() {
  return fetchJson<VendorPolicyTemplatesResponse>("/api/vendor/policies/templates", {
    method: "GET",
    cache: "no-store",
  });
}

export function fetchVendorShopPolicies() {
  return fetchJson<VendorShopPoliciesResponse>("/api/vendor/shop/policies", {
    method: "GET",
    cache: "no-store",
  });
}

export function publishVendorShopPolicy(
  policyType: PolicyType,
  payload: {
    title: string;
    body: string;
    templateId: string | null;
    acceptanceScope?: "publish" | "update";
    acceptanceText: string;
    accepted: boolean;
  },
) {
  return fetchJson<VendorPolicyPublishResponse>(
    `/api/vendor/shop/policies/${policyType}/publish`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchPublicShopPolicies(shopSlug: string) {
  return fetchJson<PublicShopPoliciesResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/policies`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}
