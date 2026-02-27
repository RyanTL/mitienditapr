"use client";

import {
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type SheetSide = "top" | "right" | "bottom" | "left";

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used inside <Sheet />.");
  }
  return context;
}

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

const sideClassMap: Record<SheetSide, string> = {
  top: "inset-x-0 top-0 rounded-b-3xl border-b",
  right: "inset-y-0 right-0 h-full w-[min(90vw,420px)] rounded-l-3xl border-l",
  bottom: "inset-x-0 bottom-0 rounded-t-3xl border-t",
  left: "inset-y-0 left-0 h-full w-[min(90vw,420px)] rounded-r-3xl border-r",
};

export function SheetContent({
  className,
  side = "right",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { side?: SheetSide }) {
  const { open, onOpenChange } = useSheetContext();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Cerrar panel"
        className="absolute inset-0 bg-[var(--overlay-black-015)]"
        onClick={() => onOpenChange(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute bg-[var(--surface-card)] p-4 shadow-[var(--elevation-high)] border-[var(--border-default)]",
          sideClassMap[side],
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </div>
  );
}

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 space-y-1", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-bold text-[var(--text-primary)]", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />
  );
}

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 flex items-center justify-end gap-2", className)} {...props} />
  );
}
