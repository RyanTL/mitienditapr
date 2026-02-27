"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used inside <Dialog />.");
  }
  return context;
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
}: {
  children: ReactElement<{ onClick?: (event: MouseEvent) => void }>;
}) {
  const { onOpenChange } = useDialogContext();
  const child = Children.only(children);

  if (!isValidElement(child)) {
    return null;
  }

  return cloneElement(child, {
    onClick: (event: MouseEvent) => {
      child.props.onClick?.(event);
      onOpenChange(true);
    },
  });
}

export function DialogContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = useDialogContext();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Cerrar dialogo"
        className="absolute inset-0 bg-[var(--overlay-black-015)]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-x-4 top-1/2 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-[var(--elevation-high)]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-bold text-[var(--text-primary)]", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 flex items-center justify-end gap-2", className)} {...props} />
  );
}
