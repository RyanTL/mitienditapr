"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TOAST_PARAMS = ["confirmado", "sesion"] as const;
type ToastParam = (typeof TOAST_PARAMS)[number];

const MESSAGES: Record<ToastParam, { title: string; body: string }> = {
  confirmado: {
    title: "¡Cuenta verificada!",
    body: "Tu correo fue confirmado. Bienvenido a Mitiendita PR.",
  },
  sesion: {
    title: "¡Bienvenido!",
    body: "Iniciaste sesión correctamente.",
  },
};

/**
 * Reads a one-shot success flag from the URL (set by /auth/callback after
 * verifying an email confirmation or completing OAuth) and shows a brief
 * toast. The flag is stripped from the URL on first render so reloading
 * the page doesn't re-show the toast.
 */
export function AuthFeedbackToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<ToastParam | null>(null);

  useEffect(() => {
    const flag = TOAST_PARAMS.find((p) => searchParams.get(p));
    if (!flag) return;

    setActive(flag);

    // Strip the flag from the URL so reloads don't re-trigger the toast.
    const next = new URLSearchParams(searchParams.toString());
    next.delete(flag);
    const query = next.toString();
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });

    const timeout = window.setTimeout(() => setActive(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [searchParams, router]);

  if (!active) return null;

  const { title, body } = MESSAGES[active];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-2xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg lg:left-auto lg:right-6 lg:mx-0"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white"
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-green-900">{title}</p>
          <p className="mt-0.5 text-xs text-green-800">{body}</p>
        </div>
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-label="Cerrar"
          className="text-sm text-green-700 hover:text-green-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
