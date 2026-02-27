import { NextResponse } from "next/server";

import {
  buildReviewSummary,
  parseReviewsLimit,
} from "@/lib/reviews/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverErrorResponse } from "@/lib/vendor/api";

type ShopRow = {
  id: string;
  is_active: boolean;
  status: string;
  rating: number;
  review_count: number;
};

type ProductRow = {
  id: string;
  name: string;
};

type ProductReviewRow = {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  reviewer_display_name: string;
  created_at: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string }> },
) {
  const { shopSlug } = await params;
  const limit = parseReviewsLimit(new URL(request.url).searchParams.get("limit"), 8);
  const supabase = await createSupabaseServerClient();

  try {
    const { data: shopData, error: shopError } = await supabase
      .from("shops")
      .select("id,is_active,status,rating,review_count")
      .eq("slug", shopSlug)
      .maybeSingle();

    if (shopError) {
      throw new Error(shopError.message);
    }

    const shop = (shopData as ShopRow | null) ?? null;
    if (!shop || !shop.is_active || shop.status !== "active") {
      return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
    }

    const summary = buildReviewSummary(shop.rating, shop.review_count);

    const { data: productRows, error: productsError } = await supabase
      .from("products")
      .select("id,name")
      .eq("shop_id", shop.id)
      .eq("is_active", true);

    if (productsError) {
      throw new Error(productsError.message);
    }

    const products = (productRows as ProductRow[] | null) ?? [];
    if (products.length === 0) {
      return NextResponse.json({
        summary,
        reviews: [],
      });
    }

    const productNameById = new Map(
      products.map((product) => [product.id, product.name]),
    );

    const { data: reviewRows, error: reviewsError } = await supabase
      .from("product_reviews")
      .select("id,product_id,rating,comment,reviewer_display_name,created_at")
      .in("product_id", products.map((product) => product.id))
      .order("created_at", { ascending: false })
      .limit(limit);

    if (reviewsError) {
      throw new Error(reviewsError.message);
    }

    return NextResponse.json({
      summary,
      reviews: ((reviewRows ?? []) as ProductReviewRow[]).map((review) => ({
        id: review.id,
        productId: review.product_id,
        productName: productNameById.get(review.product_id) ?? "Producto",
        rating: review.rating,
        comment: review.comment,
        reviewerDisplayName: review.reviewer_display_name,
        createdAt: review.created_at,
      })),
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar las reviews de la tienda.");
  }
}
