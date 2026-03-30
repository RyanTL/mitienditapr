"use client";

import type {
  DeleteMyProductReviewResponse,
  ProductReviewsResponse,
  ShopReviewsResponse,
  UpsertMyProductReviewPayload,
  UpsertMyProductReviewResponse,
} from "@/lib/reviews/types";
import { fetchJson } from "@/lib/fetch-client";

export class ReviewsRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReviewsRequestError";
    this.status = status;
  }
}

export function fetchProductReviews(shopSlug: string, productId: string) {
  return fetchJson<ProductReviewsResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "GET",
      cache: "no-store",
    },
    ReviewsRequestError,
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
    ReviewsRequestError,
  );
}

export function deleteMyProductReview(shopSlug: string, productId: string) {
  return fetchJson<DeleteMyProductReviewResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}/reviews/me`,
    {
      method: "DELETE",
    },
    ReviewsRequestError,
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
    ReviewsRequestError,
  );
}
