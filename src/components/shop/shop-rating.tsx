type ShopRatingProps = {
  rating: string;
  reviewCount: number;
  className?: string;
};

export function ShopRating({ rating, reviewCount, className }: ShopRatingProps) {
  return (
    <p className={className ?? "text-sm font-semibold text-[var(--color-carbon)]"}>
      {rating}★ ({reviewCount})
    </p>
  );
}
