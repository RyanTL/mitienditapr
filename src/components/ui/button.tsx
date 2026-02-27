import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClassMap: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--color-brand)] text-[var(--color-white)] hover:opacity-95 focus-visible:ring-[var(--color-brand)]",
  secondary:
    "bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--color-gray-100)] focus-visible:ring-[var(--color-gray-border)]",
  outline:
    "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--color-gray-border)]",
  ghost:
    "text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--color-gray-border)]",
  danger:
    "bg-[var(--color-danger)] text-[var(--color-white)] hover:opacity-95 focus-visible:ring-[var(--color-danger)]",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3 text-sm font-semibold",
  md: "h-10 rounded-xl px-4 text-sm font-semibold",
  lg: "h-12 rounded-2xl px-5 text-base font-semibold",
  icon: "h-10 w-10 rounded-full",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
          variantClassMap[variant],
          sizeClassMap[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
