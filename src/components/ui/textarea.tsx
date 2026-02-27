import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand)]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
