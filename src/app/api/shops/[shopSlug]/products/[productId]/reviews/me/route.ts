import { NextResponse } from "next/server";

import {
  buildReviewSummary,
  getReviewerDisplayName,
  isValidReviewRating,
  normalizeReviewComment,
  resolveActiveShopAndProduct,
} from "@/lib/reviews/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";

type ReviewPayload = {
  rating?: number;
  comment?: string | null;
};

type UpsertedReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_display_name: string;
  updated_at: string;
};

type ProductSummaryRow = {
  rating: number;
  review_count: number;
};

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string; productId: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.user) {
    return unauthorizedResponse();
  }

  const { shopSlug, productId } = await params;
  const payload = await parseJsonBody<ReviewPayload>(request);

  if (!payload || !isValidReviewRating(payload.rating)) {
    return badRequestResponse("La calificacion debe estar entre 1 y 5.");
  }

  const normalizedComment = normalizeReviewComment(payload.comment);
  if (typeof normalizedComment === "string" && normalizedComment.length > 500) {
    return badRequestResponse("El comentario no puede tener mas de 500 caracteres.");
  }

  try {
    const context = await resolveActiveShopAndProduct(
      auth.supabase,
      shopSlug,
      productId,
    );
    if (!context) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    if (context.shop.vendor_profile_id === auth.user.id) {
      return NextResponse.json(
        { error: "No puedes dejar reviews en tus propios productos." },
        { status: 403 },
      );
    }

    const reviewerDisplayName = await getReviewerDisplayName(
      auth.supabase,
      auth.user.id,
    );

    const { data: upsertedReview, error: upsertError } = await auth.supabase
      .from("product_reviews")
      .upsert(
        {
          product_id: context.product.id,
          profile_id: auth.user.id,
          reviewer_display_name: reviewerDisplayName,
          rating: payload.rating,
          comment: normalizedComment,
        },
        { onConflict: "product_id,profile_id" },
      )
      .select("id,rating,comment,reviewer_display_name,updated_at")
      .single();

    if (upsertError || !upsertedReview) {
      throw new Error(upsertError?.message ?? "No se pudo guardar la review.");
    }

    const { data: productSummaryRow, error: productSummaryError } = await auth.supabase
      .from("products")
      .select("rating,review_count")
      .eq("id", context.product.id)
      .single();

    if (productSummaryError || !productSummaryRow) {
      throw new Error(
        productSummaryError?.message ?? "No se pudo cargar el resumen del producto.",
      );
    }

    const productSummary = productSummaryRow as ProductSummaryRow;

    return NextResponse.json({
      ok: true,
      review: {
        id: (upsertedReview as UpsertedReviewRow).id,
        rating: (upsertedReview as UpsertedReviewRow).rating,
        comment: (upsertedReview as UpsertedReviewRow).comment,
        reviewerDisplayName: (upsertedReview as UpsertedReviewRow).reviewer_display_name,
        updatedAt: (upsertedReview as UpsertedReviewRow).updated_at,
      },
      summary: buildReviewSummary(productSummary.rating, productSummary.review_count),
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo guardar la review.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shopSlug: string; productId: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.user) {
    return unauthorizedResponse();
  }

  const { shopSlug, productId } = await params;

  try {
    const context = await resolveActiveShopAndProduct(
      auth.supabase,
      shopSlug,
      productId,
    );
    if (!context) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const { error: deleteError } = await auth.supabase
      .from("product_reviews")
      .delete()
      .eq("product_id", context.product.id)
      .eq("profile_id", auth.user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { data: productSummaryRow, error: productSummaryError } = await auth.supabase
      .from("products")
      .select("rating,review_count")
      .eq("id", context.product.id)
      .single();

    if (productSummaryError || !productSummaryRow) {
      throw new Error(
        productSummaryError?.message ?? "No se pudo cargar el resumen del producto.",
      );
    }

    const productSummary = productSummaryRow as ProductSummaryRow;

    return NextResponse.json({
      ok: true,
      summary: buildReviewSummary(productSummary.rating, productSummary.review_count),
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo eliminar la review.");
  }
}
