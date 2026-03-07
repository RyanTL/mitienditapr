"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { BackHomeBottomNav } from "@/components/navigation/back-home-bottom-nav";
import {
  changeAccountPassword,
  fetchAccountSnapshot,
  requestAccountEmailChange,
  updateAccountProfile,
} from "@/lib/account/client";

type AccountPageClientProps = {
  initialEmail: string;
  initialFullName: string;
  initialPhone: string;
  initialAddress: string;
};

type FieldState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function AccountPageClient({
  initialEmail,
  initialFullName,
  initialPhone,
  initialAddress,
}: AccountPageClientProps) {
  const [fields, setFields] = useState<FieldState>({
    fullName: initialFullName,
    email: initialEmail,
    phone: initialPhone,
    address: initialAddress,
  });
  const [currentAuthEmail, setCurrentAuthEmail] = useState(initialEmail);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const canSubmitPassword = useMemo(
    () =>
      currentPassword.trim().length > 0 &&
      newPassword.trim().length >= 6 &&
      confirmPassword.trim().length >= 6 &&
      !isSavingPassword,
    [confirmPassword, currentPassword, isSavingPassword, newPassword],
  );

  const refreshSnapshot = useCallback(async () => {
    try {
      const snapshot = await fetchAccountSnapshot();
      setFields((current) => ({
        ...current,
        fullName: snapshot.fullName,
        phone: snapshot.phone,
        address: snapshot.address,
      }));
      setCurrentAuthEmail(snapshot.email);
    } catch {
      // Keep initial values if refresh fails.
    }
  }, []);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const handleSaveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoError(null);
    setInfoSuccess(null);
    setIsSavingInfo(true);

    const nextEmail = normalizeEmail(fields.email);
    const currentEmail = normalizeEmail(currentAuthEmail);

    try {
      await updateAccountProfile({
        fullName: fields.fullName,
        phone: fields.phone,
        address: fields.address,
      });

      if (nextEmail !== currentEmail) {
        await requestAccountEmailChange(nextEmail);
        setCurrentAuthEmail(nextEmail);
        setInfoSuccess(
          "Informacion guardada. Revisa tu email para confirmar el cambio de correo.",
        );
      } else {
        setInfoSuccess("Informacion guardada correctamente.");
      }
    } catch (error) {
      setInfoError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la informacion de la cuenta.",
      );
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedNew.length < 6) {
      setPasswordError("La nueva contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (trimmedCurrent === trimmedNew) {
      setPasswordError("La nueva contrasena debe ser distinta a la actual.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setPasswordError("La confirmacion no coincide con la nueva contrasena.");
      return;
    }

    setIsSavingPassword(true);

    try {
      await changeAccountPassword({
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Contrasena actualizada correctamente.");
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contrasena.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-6 pb-32 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md space-y-4 md:max-w-3xl lg:max-w-4xl">
        <header>
          <h1 className="text-3xl font-bold leading-tight">Cuenta</h1>
          <p className="mt-1 text-sm text-[var(--color-gray-500)]">
            Administra tu informacion personal y seguridad.
          </p>
        </header>

        <section className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)] md:p-5">
          <h2 className="text-base font-bold">Informacion de cuenta</h2>

          <form className="mt-3 space-y-3" onSubmit={handleSaveInfo}>
            <div className="space-y-1">
              <label htmlFor="account-full-name" className="text-sm font-medium">
                Nombre
              </label>
              <input
                id="account-full-name"
                type="text"
                value={fields.fullName}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Tu nombre"
                className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="account-email"
                type="email"
                required
                value={fields.email}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-phone" className="text-sm font-medium">
                Telefono
              </label>
              <input
                id="account-phone"
                type="tel"
                value={fields.phone}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="(939) 000-0000"
                className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-address" className="text-sm font-medium">
                Direccion
              </label>
              <textarea
                id="account-address"
                rows={3}
                value={fields.address}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Direccion completa"
                className="w-full resize-none rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            {infoError ? (
              <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-danger)]">
                {infoError}
              </p>
            ) : null}

            {infoSuccess ? (
              <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-brand)]">
                {infoSuccess}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSavingInfo}
              className="w-full rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-[var(--color-white)] disabled:opacity-70"
            >
              {isSavingInfo ? "Guardando..." : "Guardar informacion"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)] md:p-5">
          <h2 className="text-base font-bold">Seguridad</h2>

          <form className="mt-3 space-y-3" onSubmit={handleUpdatePassword}>
            <div className="space-y-1">
              <label htmlFor="account-current-password" className="text-sm font-medium">
                Contrasena actual
              </label>
              <input
                id="account-current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-new-password" className="text-sm font-medium">
                Nueva contrasena
              </label>
              <input
                id="account-new-password"
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="account-confirm-password" className="text-sm font-medium">
                Confirmar nueva contrasena
              </label>
              <input
                id="account-confirm-password"
                type="password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            {passwordError ? (
              <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-danger)]">
                {passwordError}
              </p>
            ) : null}

            {passwordSuccess ? (
              <p className="rounded-xl bg-[var(--color-gray)] px-3 py-2 text-sm text-[var(--color-brand)]">
                {passwordSuccess}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmitPassword}
              className="w-full rounded-2xl bg-[var(--color-carbon)] px-4 py-3 text-sm font-semibold text-[var(--color-white)] disabled:opacity-70"
            >
              {isSavingPassword ? "Actualizando..." : "Cambiar contrasena"}
            </button>
          </form>
        </section>
      </main>

      <BackHomeBottomNav fallbackHref="/" />
    </div>
  );
}

