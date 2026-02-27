"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteMyProductReview,
  fetchProductReviews,
  ReviewsRequestError,
  upsertMyProductReview,
} from "@/lib/reviews/client";
import type {
  ProductReviewsResponse,
  ReviewSummary,
} from "@/lib/reviews/types";

import { StarRatingInput } from "./star-rating-input";

type ProductReviewsSectionProps = {
  shopSlug: string;
  productId: string;
  initialSummary?: ReviewSummary;
};

function formatReviewDate(dateValue: string) {
  return new Intl.DateTimeFormat("es-PR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateValue));
}

function renderStars(rating: number) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(clamped)}${"☆".repeat(5 - clamped)}`;
}

export function ProductReviewsSection({
  shopSlug,
  productId,
  initialSummary,
}: ProductReviewsSectionProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [reviewsData, setReviewsData] = useState<ProductReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [ratingDraft, setRatingDraft] = useState(5);
  const [commentDraft, setCommentDraft] = useState("");

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchProductReviews(shopSlug, productId);
      setReviewsData(response);
      setRatingDraft(response.myReview?.rating ?? 5);
      setCommentDraft(response.myReview?.comment ?? "");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar las reviews.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId, shopSlug]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const summary = useMemo(() => {
    if (reviewsData) {
      return reviewsData.summary;
    }
    return initialSummary ?? { averageRating: "0.0", reviewCount: 0 };
  }, [initialSummary, reviewsData]);

  const handleUnauthorized = useCallback(() => {
    const nextPath = pathname ?? "/";
    router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }, [pathname, router]);

  const handleSubmit = useCallback(async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await upsertMyProductReview(shopSlug, productId, {
        rating: ratingDraft,
        comment: commentDraft,
      });

      setFeedbackMessage(
        reviewsData?.myReview ? "Review actualizada." : "Review publicada.",
      );
      setReviewsData((current) =>
        current
          ? {
              ...current,
              myReview: {
                id: response.review.id,
                rating: response.review.rating,
                comment: response.review.comment,
                updatedAt: response.review.updatedAt,
              },
              summary: response.summary,
            }
          : current,
      );

      await loadReviews();
    } catch (error) {
      if (error instanceof ReviewsRequestError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar la review.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    commentDraft,
    handleUnauthorized,
    loadReviews,
    productId,
    ratingDraft,
    reviewsData?.myReview,
    shopSlug,
  ]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await deleteMyProductReview(shopSlug, productId);

      setFeedbackMessage("Review eliminada.");
      setReviewsData((current) =>
        current
          ? {
              ...current,
              myReview: null,
              summary: response.summary,
            }
          : current,
      );
      setRatingDraft(5);
      setCommentDraft("");

      await loadReviews();
    } catch (error) {
      if (error instanceof ReviewsRequestError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo eliminar la review.",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [handleUnauthorized, loadReviews, productId, shopSlug]);

  return (
    <section className="mt-8 rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-2xl font-bold leading-none text-[var(--color-carbon)]">
            Reviews
          </h3>
          <p className="mt-1 text-sm text-[var(--color-carbon)]">
            {summary.averageRating} de 5 ({summary.reviewCount})
          </p>
        </div>
        <p className="text-lg text-[var(--color-brand)]">
          {renderStars(Number(summary.averageRating))}
        </p>
      </header>

      {feedbackMessage ? (
        <p className="mb-3 rounded-2xl border border-[var(--color-brand)] bg-[var(--color-white)] px-3 py-2 text-xs text-[var(--color-brand)]">
          {feedbackMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mb-3 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {errorMessage}
        </p>
      ) : null}

      <div className="rounded-2xl bg-[var(--color-gray-100)] p-3">
        <p className="text-sm font-semibold text-[var(--color-carbon)]">
          {reviewsData?.myReview ? "Edita tu review" : "Deja tu review"}
        </p>

        <StarRatingInput
          value={ratingDraft}
          onChange={(nextValue) => setRatingDraft(nextValue)}
          disabled={isSaving || isDeleting}
          className="mt-2 inline-flex items-center gap-1"
        />

        <textarea
          value={commentDraft}
          maxLength={500}
          rows={3}
          disabled={isSaving || isDeleting}
          onChange={(event) => setCommentDraft(event.target.value)}
          placeholder="Comentario opcional"
          className="mt-3 w-full resize-none rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-gray-500)]">
            {commentDraft.length}/500
          </p>
          <div className="flex items-center gap-2">
            {reviewsData?.myReview ? (
              <button
                type="button"
                disabled={isDeleting || isSaving}
                onClick={() => void handleDelete()}
                className="rounded-full border border-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)] disabled:opacity-70"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => void handleSubmit()}
              className="rounded-full bg-[var(--color-brand)] px-3 py-1.5 text-xs font-semibold text-[var(--color-white)] disabled:opacity-70"
            >
              {isSaving
                ? "Guardando..."
                : reviewsData?.myReview
                  ? "Actualizar review"
                  : "Publicar review"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-[var(--color-gray-500)]">Cargando reviews...</p>
        ) : reviewsData && reviewsData.reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-gray-500)]">
            Aun no hay reviews para este producto.
          </p>
        ) : (
          <div className="space-y-3">
            {(reviewsData?.reviews ?? []).map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-[var(--color-carbon)]">
                    {review.reviewerDisplayName}
                  </p>
                  <p className="text-xs text-[var(--color-gray-500)]">
                    {formatReviewDate(review.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-[var(--color-brand)]">
                  {renderStars(review.rating)}
                </p>
                {review.comment ? (
                  <p className="mt-1 text-sm text-[var(--color-carbon)]">{review.comment}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
