import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
