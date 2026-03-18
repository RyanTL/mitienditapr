"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?type=recovery`,
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("rate limit") || lower.includes("too many"))
          setErrorMessage("Espera un momento antes de volver a intentarlo.");
        else setErrorMessage("No se pudo enviar el email. Inténtalo de nuevo.");
        return;
      }

      setSuccessMessage(
        "Te enviamos un enlace para restablecer tu contraseña. Revisa tu email.",
      );
    } catch {
      setErrorMessage("No se pudo enviar el email. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        disabled={isSubmitting || !!successMessage}
        className="w-full rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-base font-semibold text-[var(--color-white)] disabled:opacity-70"
      >
        {isSubmitting ? "Enviando..." : "Enviar enlace"}
      </button>

      <p className="text-center text-sm text-[var(--color-carbon)]">
        <Link href="/sign-in" className="font-semibold text-[var(--color-brand)]">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
