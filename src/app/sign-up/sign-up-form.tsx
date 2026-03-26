"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GoogleIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignUpFormProps = {
  nextPath: string;
};

function toSpanishError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered"))
    return "Ya existe una cuenta con ese email. Intenta iniciar sesión.";
  if (lower.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (lower.includes("unable to validate email") || lower.includes("invalid email"))
    return "El formato del email no es válido.";
  if (lower.includes("too many requests") || lower.includes("rate limit"))
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Error de conexión. Revisa tu internet e inténtalo de nuevo.";
  return "No se pudo crear la cuenta. Inténtalo de nuevo.";
}

export function SignUpForm({ nextPath }: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      // Pass next path via cookie — query params in redirectTo break Supabase's allowlist check
      document.cookie = `oauth_next=${encodeURIComponent(nextPath)}; path=/; max-age=300; SameSite=Lax`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
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
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) {
        setErrorMessage(toSpanishError(error.message));
        return;
      }

      setSuccessMessage("Cuenta creada. Revisa tu email para confirmar tu cuenta antes de entrar.");
      setTimeout(() => {
        router.push("/sign-in");
      }, 1200);
    } catch {
      setErrorMessage("No se pudo crear la cuenta. Inténtalo de nuevo.");
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
          <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="name">
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
            placeholder="Tu nombre"
          />
        </div>

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
          <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={6}
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-brand)]">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="w-full rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-base font-semibold text-[var(--color-white)] disabled:opacity-70"
        >
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-[var(--color-carbon)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/sign-in" className="font-semibold text-[var(--color-brand)]">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
