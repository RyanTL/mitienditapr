export type ReviewSummary = {
  averageRating: string;
  reviewCount: number;
};

export type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  reviewerDisplayName: string;
  createdAt: string;
};

export type MyProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  updatedAt: string;
};

export type ProductReviewsResponse = {
  summary: ReviewSummary;
  myReview: MyProductReview | null;
  reviews: ProductReview[];
};

export type UpsertMyProductReviewPayload = {
  rating: number;
  comment?: string | null;
};

export type UpsertMyProductReviewResponse = {
  ok: true;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    reviewerDisplayName: string;
    updatedAt: string;
  };
  summary: ReviewSummary;
};

export type DeleteMyProductReviewResponse = {
  ok: true;
  summary: ReviewSummary;
};

export type ShopReview = {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string | null;
  reviewerDisplayName: string;
  createdAt: string;
};

export type ShopReviewsResponse = {
  summary: ReviewSummary;
  reviews: ShopReview[];
};
