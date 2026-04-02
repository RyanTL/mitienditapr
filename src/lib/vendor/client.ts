"use client";

import type { VendorOrderStatus, VendorShopStatus } from "@/lib/vendor/constants";
import type { VendorStatusResponse } from "@/lib/vendor/types";
import { fetchJson } from "@/lib/fetch-client";

export function fetchVendorStatus() {
  return fetchJson<VendorStatusResponse>("/api/vendor/status", {
    method: "GET",
    cache: "no-store",
  });
}

export function startVendorOnboarding() {
  return fetchJson<{
    onboarding: VendorStatusResponse["onboarding"];
    snapshot: VendorStatusResponse;
  }>("/api/vendor/onboarding/start", {
    method: "POST",
  });
}

export function saveVendorOnboardingStep(step: number, payload: Record<string, unknown>) {
  return fetchJson<{
    onboarding: VendorStatusResponse["onboarding"];
    checks: VendorStatusResponse["checks"];
    nextStep: number;
    completed: boolean;
  }>("/api/vendor/onboarding/step", {
    method: "PATCH",
    body: JSON.stringify({
      step,
      payload,
    }),
  });
}

export function publishVendorShop() {
  return fetchJson<{
    published: boolean;
    blockingReasons: string[];
  }>("/api/vendor/shop/publish", {
    method: "POST",
  });
}

export function fetchVendorShopSettings() {
  return fetchJson<{
    shop: VendorStatusResponse["shop"];
    policies: {
      shop_id: string;
      refund_policy: string;
      shipping_policy: string;
      privacy_policy: string;
      terms: string;
    } | null;
    policyCompletion?: {
      terms: "completed" | "recommended" | "required";
      shipping: "completed" | "recommended" | "required";
      refund: "completed" | "recommended" | "required";
      privacy: "completed" | "recommended" | "required";
      requiredReady: boolean;
    };
    currentPolicyVersionIds?: {
      terms: string;
      shipping: string;
    } | null;
    checks: VendorStatusResponse["checks"];
  }>("/api/vendor/shop", {
    method: "GET",
    cache: "no-store",
  });
}

export function updateVendorShopSettings(payload: {
  vendorName?: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
  shippingFlatFeeUsd?: number;
  offersPickup?: boolean;
  athMovilPhone?: string | null;
  status?: VendorShopStatus;
  policies?: {
    refundPolicy?: string;
    shippingPolicy?: string;
    privacyPolicy?: string;
    terms?: string;
  };
}) {
  return fetchJson<{
    shop: VendorStatusResponse["shop"];
    checks: VendorStatusResponse["checks"];
  }>("/api/vendor/shop", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type VendorVariantInput = {
  title: string;
  sku?: string;
  priceUsd: number;
  stockQty: number | null;
  isActive?: boolean;
  attributes?: Record<string, string>;
};

export function fetchVendorProducts() {
  return fetchJson<{
    products: Array<{
      id: string;
      shopId: string;
      name: string;
      description: string;
      imageUrl: string | null;
      priceUsd: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      variants: Array<{
        id: string;
        productId: string;
        title: string;
        sku: string | null;
        attributes: Record<string, unknown>;
        priceUsd: number;
        stockQty: number;
        isActive: boolean;
      }>;
      images: Array<{
        id: string;
        productId: string;
        imageUrl: string;
        alt: string | null;
        sortOrder: number;
      }>;
    }>;
    productLimit: number | null;
    productCount: number;
  }>("/api/vendor/products", {
    method: "GET",
    cache: "no-store",
  });
}

export function createVendorProduct(payload: {
  name: string;
  description?: string;
  imageUrl?: string;
  images?: Array<{ imageUrl: string; alt?: string | null }>;
  isActive?: boolean;
  variant: VendorVariantInput;
}) {
  return fetchJson<{ product: { id: string; name: string } }>("/api/vendor/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVendorProduct(
  productId: string,
  payload: {
    name?: string;
    description?: string;
    imageUrl?: string | null;
    isActive?: boolean;
    priceUsd?: number;
  },
) {
  return fetchJson<{ ok: true }>(`/api/vendor/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveVendorProduct(productId: string) {
  return fetchJson<{ ok: true }>(`/api/vendor/products/${productId}/archive`, {
    method: "POST",
  });
}

export function deleteVendorProduct(productId: string) {
  return fetchJson<{ ok: true }>(`/api/vendor/products/${productId}`, {
    method: "DELETE",
  });
}

export function createVendorVariant(productId: string, payload: VendorVariantInput) {
  return fetchJson<{ ok: true }>(`/api/vendor/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addVendorProductImage(
  productId: string,
  payload: { imageUrl: string; alt?: string | null },
) {
  return fetchJson<{
    image: {
      id: string;
      productId: string;
      imageUrl: string;
      alt: string | null;
      sortOrder: number;
    };
  }>(`/api/vendor/products/${productId}/images`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteVendorProductImage(productId: string, imageId: string) {
  return fetchJson<{ ok: true }>(
    `/api/vendor/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
    },
  );
}

export function updateVendorVariant(
  variantId: string,
  payload: Partial<VendorVariantInput>,
) {
  return fetchJson<{ ok: true }>(`/api/vendor/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchVendorOrders() {
  return fetchJson<{
    orders: Array<{
      id: string;
      status: string;
      vendorStatus: VendorOrderStatus;
      subtotalUsd: number;
      totalUsd: number;
      createdAt: string;
      buyer: {
        id: string;
        email: string | null;
        fullName: string | null;
      } | null;
      items: Array<{
        productId: string;
        productVariantId: string | null;
        productName: string;
        quantity: number;
        unitPriceUsd: number;
      }>;
    }>;
  }>("/api/vendor/orders", {
    method: "GET",
    cache: "no-store",
  });
}

export function updateVendorOrderStatus(orderId: string, status: VendorOrderStatus) {
  return fetchJson<{ ok: true }>(`/api/vendor/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function createStripeConnectAccountLink() {
  return fetchJson<{ url: string; stripeConnectAccountId: string }>(
    "/api/stripe/connect/account-link",
    {
      method: "POST",
    },
  );
}

export function createStripeSubscriptionCheckout() {
  return fetchJson<{ url: string }>("/api/stripe/subscription/checkout", {
    method: "POST",
  });
}

export type VerifyStripeSubscriptionResult = {
  status: "active" | "pending" | "invalid";
  message?: string;
  redirectTo?: string;
};

export function verifyStripeSubscriptionCheckout(sessionId: string) {
  return fetchJson<VerifyStripeSubscriptionResult>("/api/stripe/subscription/verify", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function redeemVendorAccessCode(code: string) {
  return fetchJson<{
    ok: boolean;
    alreadyRedeemed: boolean;
    benefitType: "free_months" | "lifetime_free";
    benefitMonths: number | null;
    currentPeriodEnd: string | null;
  }>("/api/vendor/subscription/redeem-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function fetchAdminVendorAccessCodes() {
  return fetchJson<{
    codes: Array<{
      id: string;
      label: string;
      isActive: boolean;
      maxRedemptions: number | null;
      redeemedCount: number;
      benefitType: "free_months" | "lifetime_free";
      benefitMonths: number | null;
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  }>("/api/admin/vendor-access-codes", {
    method: "GET",
    cache: "no-store",
  });
}

export function createAdminVendorAccessCode(payload: {
  label: string;
  benefitType: "free_months" | "lifetime_free";
  benefitMonths?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
}) {
  return fetchJson<{
    code: {
      id: string;
      label: string;
      plainCode: string;
      isActive: boolean;
      maxRedemptions: number | null;
      redeemedCount: number;
      benefitType: "free_months" | "lifetime_free";
      benefitMonths: number | null;
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>("/api/admin/vendor-access-codes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminVendorAccessCode(
  codeId: string,
  payload: {
    label?: string;
    isActive?: boolean;
    maxRedemptions?: number | null;
    expiresAt?: string | null;
  },
) {
  return fetchJson<{
    code: {
      id: string;
      label: string;
      isActive: boolean;
      maxRedemptions: number | null;
      redeemedCount: number;
      benefitType: "free_months" | "lifetime_free";
      benefitMonths: number | null;
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>(`/api/admin/vendor-access-codes/${codeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadVendorImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/vendor/uploads/image", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as
    | { url?: string; path?: string; bucket?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }

  if (!body?.url) {
    throw new Error("No se pudo obtener la URL de la imagen.");
  }

  return {
    url: body.url,
    path: body.path ?? null,
    bucket: body.bucket ?? null,
  };
}
