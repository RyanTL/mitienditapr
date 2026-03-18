"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GoogleIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignInFormProps = {
  nextPath: string;
  initialError?: string | null;
};

function toSpanishError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (lower.includes("email not confirmed")) return "Confirma tu email antes de entrar.";
  if (lower.includes("too many requests") || lower.includes("rate limit"))
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Error de conexión. Revisa tu internet e inténtalo de nuevo.";
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export function SignInForm({ nextPath, initialError = null }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (error) setErrorMessage("No se pudo conectar con Google. Inténtalo de nuevo.");
    } catch {
      setErrorMessage("No se pudo conectar con Google. Inténtalo de nuevo.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage(toSpanishError(error.message));
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setErrorMessage("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={isGoogleLoading || isSubmitting}
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-4 py-3 text-base font-semibold text-[var(--color-carbon)] shadow-sm disabled:opacity-70 active:bg-[var(--color-gray-100)]"
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        {isGoogleLoading ? "Conectando..." : "Continuar con Google"}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-gray-border)]" />
        <span className="text-sm font-medium text-[var(--color-gray-500)]">o</span>
        <div className="h-px flex-1 bg-[var(--color-gray-border)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="password">
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-[var(--color-gray-500)] hover:text-[var(--color-brand)]"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
            placeholder="********"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="w-full rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-base font-semibold text-[var(--color-white)] disabled:opacity-70"
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-[var(--color-carbon)]">
          ¿No tienes cuenta?{" "}
          <Link
            href={`/sign-up${nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
            className="font-semibold text-[var(--color-brand)]"
          >
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  );
}
