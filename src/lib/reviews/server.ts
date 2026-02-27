import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveProductDatabaseId } from "@/lib/catalog-mapping";
import type { ReviewSummary } from "@/lib/reviews/types";

type ShopRow = {
  id: string;
  slug: string;
  vendor_profile_id: string;
  is_active: boolean;
  status: string;
  rating: number;
  review_count: number;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  is_active: boolean;
  rating: number;
  review_count: number;
};

export type ActiveShopProductContext = {
  shop: ShopRow;
  product: ProductRow;
};

export function formatAverageRating(rating: number | null | undefined) {
  return Number(rating ?? 0).toFixed(1);
}

export function buildReviewSummary(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
): ReviewSummary {
  return {
    averageRating: formatAverageRating(rating),
    reviewCount: Number(reviewCount ?? 0),
  };
}

export function normalizeReviewComment(input: unknown) {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

export function isValidReviewRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function parseReviewsLimit(rawLimit: string | null, fallback = 8) {
  if (!rawLimit) {
    return fallback;
  }

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(20, Math.max(1, Math.trunc(parsed)));
}

export async function resolveActiveShopAndProduct(
  supabase: SupabaseClient,
  shopSlug: string,
  productId: string,
): Promise<ActiveShopProductContext | null> {
  const { data: shopRow, error: shopError } = await supabase
    .from("shops")
    .select("id,slug,vendor_profile_id,is_active,status,rating,review_count")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (shopError) {
    throw new Error(shopError.message);
  }

  const shop = (shopRow as ShopRow | null) ?? null;
  if (!shop || !shop.is_active || shop.status !== "active") {
    return null;
  }

  const databaseProductId = resolveProductDatabaseId(shopSlug, productId);
  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select("id,shop_id,name,is_active,rating,review_count")
    .eq("id", databaseProductId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (productError) {
    throw new Error(productError.message);
  }

  const product = (productRow as ProductRow | null) ?? null;
  if (!product || !product.is_active) {
    return null;
  }

  return { shop, product };
}

export async function getReviewerDisplayName(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const fullName =
    data && typeof data.full_name === "string" ? data.full_name.trim() : "";
  if (fullName.length > 0) {
    return fullName;
  }

  const email = data && typeof data.email === "string" ? data.email.trim() : "";
  if (email.length > 0) {
    return email;
  }

  return "Usuario";
}
