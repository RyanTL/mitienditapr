"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-warm-page)] px-4 text-center">
      <p className="text-7xl font-extrabold text-[var(--color-carbon)]">500</p>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-carbon)]">
        Algo salió mal
      </h1>
      <p className="mt-2 text-sm text-[var(--color-gray-500)]">
        Ocurrió un error inesperado. Por favor intenta de nuevo.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-[var(--color-carbon)] px-6 py-3 text-sm font-semibold text-[var(--color-white)]"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-full border border-[var(--color-gray-border)] bg-[var(--color-white)] px-6 py-3 text-sm font-semibold text-[var(--color-carbon)]"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
