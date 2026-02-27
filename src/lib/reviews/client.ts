"use client";

import type {
  DeleteMyProductReviewResponse,
  ProductReviewsResponse,
  ShopReviewsResponse,
  UpsertMyProductReviewPayload,
  UpsertMyProductReviewResponse,
} from "@/lib/reviews/types";

export class ReviewsRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReviewsRequestError";
    this.status = status;
  }
}

async function fetchJson<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | (TResponse & { error?: string })
    | null;

  if (!response.ok) {
    throw new ReviewsRequestError(
      body?.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  if (!body) {
    throw new ReviewsRequestError(
      "Respuesta invalida del servidor.",
      response.status,
    );
  }

  return body;
}

export function fetchProductReviews(shopSlug: string, productId: string) {
  return fetchJson<ProductReviewsResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function upsertMyProductReview(
  shopSlug: string,
  productId: string,
  payload: UpsertMyProductReviewPayload,
) {
  return fetchJson<UpsertMyProductReviewResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}/reviews/me`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteMyProductReview(shopSlug: string, productId: string) {
  return fetchJson<DeleteMyProductReviewResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}/reviews/me`,
    {
      method: "DELETE",
    },
  );
}

export function fetchShopReviews(shopSlug: string, limit = 8) {
  const clampedLimit = Number.isFinite(limit)
    ? Math.min(20, Math.max(1, Math.trunc(limit)))
    : 8;

  return fetchJson<ShopReviewsResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/reviews?limit=${clampedLimit}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
}
