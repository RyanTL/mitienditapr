import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Separator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={cn("h-px w-full bg-[var(--border-default)]", className)}
      {...props}
    />
  ),
);

Separator.displayName = "Separator";
