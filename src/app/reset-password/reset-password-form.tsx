"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PASSWORD_REQUIREMENTS_MESSAGE =
  "La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula y un número.";

function isPasswordStrongEnough(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirm) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    if (!isPasswordStrongEnough(password)) {
      setErrorMessage(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("same password") || lower.includes("different from"))
          setErrorMessage("La nueva contraseña debe ser diferente a la anterior.");
        else if (
          lower.includes("weak") ||
          lower.includes("short") ||
          lower.includes("password should be at least") ||
          lower.includes("password should contain")
        )
          setErrorMessage(PASSWORD_REQUIREMENTS_MESSAGE);
        else setErrorMessage("No se pudo cambiar la contraseña. El enlace puede haber expirado.");
        return;
      }

      router.replace("/sign-in");
    } catch {
      setErrorMessage("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="password">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
          placeholder="Mínimo 8 caracteres"
        />
        <p className="text-xs text-[var(--color-gray-500)]">
          Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-carbon)]" htmlFor="confirm">
          Confirmar contraseña
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="w-full rounded-xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-3 py-2 text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
          placeholder="Repite la contraseña"
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
        {isSubmitting ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
