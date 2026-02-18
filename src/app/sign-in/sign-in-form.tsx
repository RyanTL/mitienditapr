"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignInFormProps = {
  nextPath: string;
};

export function SignInForm({ nextPath }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace(nextPath);
    router.refresh();
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="password">
          Contrasena
        </label>
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
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-base font-semibold text-[var(--color-white)] disabled:opacity-70"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-[var(--color-carbon)]">
        No tienes cuenta?{" "}
        <Link href="/sign-up" className="font-semibold text-[var(--color-brand)]">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
