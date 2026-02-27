"use client";

type StarRatingInputProps = {
  value: number;
  onChange: (nextValue: number) => void;
  disabled?: boolean;
  className?: string;
  starClassName?: string;
};

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  className,
  starClassName,
}: StarRatingInputProps) {
  return (
    <div className={className ?? "inline-flex items-center gap-1"}>
      {Array.from({ length: 5 }, (_, index) => {
        const currentStarValue = index + 1;
        const isFilled = currentStarValue <= value;

        return (
          <button
            key={currentStarValue}
            type="button"
            disabled={disabled}
            aria-label={`${currentStarValue} estrella${currentStarValue === 1 ? "" : "s"}`}
            aria-pressed={isFilled}
            className="leading-none disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => onChange(currentStarValue)}
          >
            <span
              className={[
                "text-2xl",
                isFilled
                  ? "text-[var(--color-brand)]"
                  : "text-[var(--color-gray-300)]",
                starClassName,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
}
