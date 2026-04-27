"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CheckIcon } from "@/components/icons";
import { verifyStripeSubscriptionCheckout } from "@/lib/vendor/client";

type ActivationState = "loading" | "success" | "error";

function Spinner({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-black border-t-transparent ${className}`}
    />
  );
}

export function VendorActivationClient() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const missingSession = !sessionId;

  const [state, setState] = useState<ActivationState>("loading");
  const [message, setMessage] = useState("Estamos activando tu cuenta de vendedor…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const sid: string = sessionId;

    let alive = true;

    async function verifyUntilReady() {
      setState("loading");

      const maxAttempts = 12;

      for (let index = 0; index < maxAttempts; index += 1) {
        try {
          const result = await verifyStripeSubscriptionCheckout(sid);
          if (!alive) {
            return;
          }

          if (result.status === "active") {
            setState("success");
            setMessage("Tu suscripción está activa. Te llevamos a tu panel ahora.");
            window.setTimeout(() => {
              if (alive) {
                router.replace(result.redirectTo ?? "/vendedor/panel?welcome=vendor-activated");
              }
            }, 700);
            return;
          }

          if (result.status === "invalid") {
            setState("error");
            setMessage(
              result.message ?? "No pudimos validar este pago para tu tienda.",
            );
            return;
          }

          setMessage(
            result.message ?? "Tu pago fue recibido. Estamos terminando de activar tu cuenta.",
          );
        } catch {
          if (!alive) {
            return;
          }
          setMessage("Seguimos confirmando tu suscripción. Esto puede tardar unos segundos.");
        }

        await new Promise((resolve) => window.setTimeout(resolve, Math.min(1500 + index * 350, 5000)));
      }

      if (!alive) {
        return;
      }

      setState("error");
      setMessage("Tu pago fue procesado, pero la activación tardó más de lo esperado. Inténtalo de nuevo.");
    }

    void verifyUntilReady();

    return () => {
      alive = false;
    };
  }, [attempt, missingSession, router, sessionId]);

  const displayState = missingSession ? "error" : state;
  const displayMessage = missingSession
    ? "No encontramos la sesión de pago. Intenta activar tu tienda otra vez."
    : message;

  return (
    <div className="min-h-screen bg-[var(--vendor-page-bg)] px-4 py-8 text-[var(--color-carbon)] md:px-8 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center md:max-w-lg lg:max-w-xl">
        <div className="w-full rounded-[28px] border border-[var(--vendor-card-border)] bg-white p-8 text-center shadow-[var(--vendor-card-shadow)] md:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--vendor-page-bg)]">
            {displayState === "success" ? (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                <CheckIcon className="h-6 w-6" />
              </span>
            ) : displayState === "error" ? (
              <span className="text-3xl font-semibold text-black">!</span>
            ) : (
              <Spinner />
            )}
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-black">
            {displayState === "error"
              ? "No pudimos terminar la activación"
              : "Estamos activando tu tienda"}
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--vendor-nav-text)]">
            {displayMessage}
          </p>

          {displayState === "loading" ? (
            <p className="mt-6 text-sm text-[var(--vendor-nav-text)]">
              No cierres esta página. Enseguida tendrás acceso para listar tus productos.
            </p>
          ) : null}

          {displayState === "error" ? (
            <div className="mt-8 flex flex-col gap-3">
              {!missingSession ? (
                <button
                  type="button"
                  onClick={() => setAttempt((current) => current + 1)}
                  className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                >
                  Reintentar activación
                </button>
              ) : null}
              <Link
                href="/vendedor/onboarding"
                className="w-full rounded-full border border-[var(--vendor-card-border)] px-5 py-3 text-sm font-semibold text-[var(--color-carbon)] transition-colors hover:bg-[var(--vendor-page-bg)]"
              >
                Volver al onboarding
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
