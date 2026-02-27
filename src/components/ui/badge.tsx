import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

const variantClassMap: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-brand)] text-[var(--color-white)]",
  secondary: "bg-[var(--surface-muted)] text-[var(--text-primary)]",
  outline: "border border-[var(--border-default)] text-[var(--text-primary)]",
};

export const Badge = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
      variantClassMap[variant],
      className,
    )}
    {...props}
  />
));

Badge.displayName = "Badge";
