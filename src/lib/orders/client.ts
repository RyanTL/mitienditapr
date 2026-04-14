"use client";

import { fetchJson } from "@/lib/fetch-client";
import type { OrderFulfillmentMethod } from "@/lib/orders/constants";

export type CheckoutPolicyAcceptanceInput = {
  shopId: string;
  termsVersionId: string;
  shippingVersionId: string;
  acceptedAt: string;
  acceptanceText: string;
};

export type CheckoutFulfillmentInput = {
  method: OrderFulfillmentMethod;
  shippingAddress?: string | null;
  shippingZipCode?: string | null;
  pickupNotes?: string | null;
};

export type CheckoutBuyerInput = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type CheckoutRequestPayload = {
  shopSlug: string;
  buyer: CheckoutBuyerInput;
  fulfillment: CheckoutFulfillmentInput;
  policyAcceptance: CheckoutPolicyAcceptanceInput;
};

export function createStripeCheckoutSession(payload: CheckoutRequestPayload) {
  return fetchJson<{ ok: true; orderId: string; url: string }>(
    "/api/checkout/stripe/session",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createAthMovilCheckout(input: {
  payload: CheckoutRequestPayload;
  receipt: File;
  receiptNote?: string | null;
}) {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(input.payload));
  formData.set("receipt", input.receipt);
  if (input.receiptNote) {
    formData.set("receiptNote", input.receiptNote);
  }

  const response = await fetch("/api/checkout/ath-movil", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; orderId?: string; paymentStatus?: string; error?: string }
    | null;

  if (!response.ok || !body?.ok || !body.orderId) {
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }

  return {
    orderId: body.orderId,
    paymentStatus: body.paymentStatus ?? "awaiting_vendor_verification",
  };
}
