import { NextResponse } from "next/server";

import {
  buildReviewSummary,
  resolveActiveShopAndProduct,
} from "@/lib/reviews/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverErrorResponse } from "@/lib/vendor/api";

type ProductReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_display_name: string;
  created_at: string;
};

type MyReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  updated_at: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shopSlug: string; productId: string }> },
) {
  const { shopSlug, productId } = await params;
  const supabase = await createSupabaseServerClient();

  try {
    const context = await resolveActiveShopAndProduct(supabase, shopSlug, productId);
    if (!context) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const summary = buildReviewSummary(
      context.product.rating,
      context.product.review_count,
    );

    const { data: reviewsData, error: reviewsError } = await supabase
      .from("product_reviews")
      .select("id,rating,comment,reviewer_display_name,created_at")
      .eq("product_id", context.product.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (reviewsError) {
      throw new Error(reviewsError.message);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    let myReview: MyReviewRow | null = null;
    if (user) {
      const { data: myReviewRow, error: myReviewError } = await supabase
        .from("product_reviews")
        .select("id,rating,comment,updated_at")
        .eq("product_id", context.product.id)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (myReviewError) {
        throw new Error(myReviewError.message);
      }

      myReview = (myReviewRow as MyReviewRow | null) ?? null;
    }

    return NextResponse.json({
      summary,
      myReview: myReview
        ? {
            id: myReview.id,
            rating: myReview.rating,
            comment: myReview.comment,
            updatedAt: myReview.updated_at,
          }
        : null,
      reviews: ((reviewsData ?? []) as ProductReviewRow[]).map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewerDisplayName: review.reviewer_display_name,
        createdAt: review.created_at,
      })),
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar las reviews.");
  }
}
