"use client";

import Link from "next/link";

import { CloseIcon, LinkIcon, QrCodeIcon } from "@/components/icons";
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";

type VisitorWelcomePopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function VisitorWelcomePopup({
  isOpen,
  onClose,
}: VisitorWelcomePopupProps) {
  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-015)] backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-labelledby="visitor-welcome-title"
        aria-describedby="visitor-welcome-description"
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-[var(--color-gray)] bg-[var(--color-white)] p-6 pb-8 text-[var(--color-carbon)] shadow-[0_-8px_40px_var(--shadow-black-018)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:p-7 md:shadow-[0_22px_54px_var(--shadow-black-018)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-end">
          <button
            type="button"
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)]"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-brand)]">
            ¡Bienvenido!
          </p>
          <h2
            id="visitor-welcome-title"
            className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight"
          >
            Crea tu tiendita gratis
          </h2>
          <p
            id="visitor-welcome-description"
            className="mt-2 text-sm leading-relaxed text-[var(--color-gray-500)]"
          >
            Vende tus productos online y compártelos con tu link y código QR.
            Sin costo para empezar.
          </p>
        </div>

        <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-[var(--color-carbon)]">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-1.5">
            <QrCodeIcon className="h-3.5 w-3.5" />
            Código QR
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            Link compartible
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-1.5">
            Sin costo
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-2 md:flex-row-reverse">
          <Link
            href="/vendedor/onboarding"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Crear mi tiendita
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-3 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)]"
          >
            Seguir viendo tiendas
          </button>
        </div>
      </section>
    </div>
  );
}
