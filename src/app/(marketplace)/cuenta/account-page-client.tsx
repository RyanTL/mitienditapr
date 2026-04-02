"use client";

import { useMemo, useState, type FormEvent } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { BackHomeBottomNav } from "@/components/navigation/back-home-bottom-nav";
import {
  changeAccountPassword,
  requestAccountEmailChange,
  updateAccountProfile,
} from "@/lib/account/client";

type AccountPageClientProps = {
  initialEmail: string;
  initialFullName: string;
  initialPhone: string;
  initialAddress: string;
  initialZipCode: string;
};

function getUserInitial(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed.length > 0) return trimmed[0].toUpperCase();
  const local = email.split("@")[0];
  return local.length > 0 ? local[0].toUpperCase() : "?";
}

const inputClass =
  "w-full rounded-2xl bg-[var(--color-gray-100)] px-4 py-3 text-sm text-[var(--color-carbon)] outline-none border-2 border-transparent transition-colors placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:bg-white";

const textareaClass =
  "w-full resize-none rounded-2xl bg-[var(--color-gray-100)] px-4 py-3 text-sm text-[var(--color-carbon)] outline-none border-2 border-transparent transition-colors placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:bg-white";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-[var(--color-gray-500)] mb-1.5">
      {children}
    </label>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  minLength,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={minLength}
          required={required}
          className={inputClass + " pr-11"}
        />
        <button
          type="button"
          aria-label={visible ? "Ocultar" : "Mostrar"}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gray-500)] hover:text-[var(--color-carbon)] transition-colors"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  if (error)
    return <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>;
  if (success)
    return <p className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{success}</p>;
  return null;
}

export function AccountPageClient({
  initialEmail,
  initialFullName,
  initialPhone,
  initialAddress,
  initialZipCode,
}: AccountPageClientProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [zipCode, setZipCode] = useState(initialZipCode);
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

  const handleSaveInfo = async (e: FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    setInfoSuccess(null);
    setIsSavingInfo(true);

    const nextEmail = email.trim().toLowerCase();
    const currentEmail = currentAuthEmail.trim().toLowerCase();

    try {
      await updateAccountProfile({ fullName, phone, address, zipCode });

      if (nextEmail !== currentEmail) {
        await requestAccountEmailChange(nextEmail);
        setCurrentAuthEmail(nextEmail);
        setInfoSuccess("Información guardada. Revisa tu email para confirmar el cambio.");
      } else {
        setInfoSuccess("Información guardada correctamente.");
      }
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "No se pudo guardar la información.");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const curr = currentPassword.trim();
    const next = newPassword.trim();
    const conf = confirmPassword.trim();

    if (next.length < 6) { setPasswordError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (curr === next) { setPasswordError("La nueva contraseña debe ser distinta a la actual."); return; }
    if (next !== conf) { setPasswordError("La confirmación no coincide con la nueva contraseña."); return; }

    setIsSavingPassword(true);
    try {
      await changeAccountPassword({ currentPassword: curr, newPassword: next });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordSuccess("Contraseña actualizada correctamente.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const avatarInitial = getUserInitial(fullName, currentAuthEmail);

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] text-[var(--color-carbon)]">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-36 md:px-5 lg:pb-12">

        {/* Avatar */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-carbon)] text-3xl font-bold text-[var(--color-white)] shadow-lg">
            {avatarInitial}
          </div>
          {fullName.trim() && (
            <p className="text-lg font-bold">{fullName.trim()}</p>
          )}
          <p className="text-sm text-[var(--color-gray-500)]">{currentAuthEmail}</p>
        </div>

        <div className="space-y-4">

          {/* Personal info */}
          <div className="rounded-3xl bg-[var(--color-white)] p-5 shadow-[0_2px_16px_var(--shadow-black-008)]">
            <h2 className="mb-4 text-sm font-bold text-[var(--color-carbon)]">
              Información personal
            </h2>
            <form className="space-y-3" onSubmit={handleSaveInfo}>
              <div>
                <FieldLabel htmlFor="full-name">Nombre</FieldLabel>
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(939) 000-0000"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="zip-code">Código postal</FieldLabel>
                <input
                  id="zip-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="00XXX"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="address">Dirección</FieldLabel>
                <textarea
                  id="address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tu dirección completa"
                  className={textareaClass}
                />
              </div>

              <Feedback error={infoError} success={infoSuccess} />

              <button
                type="submit"
                disabled={isSavingInfo}
                className="w-full rounded-2xl bg-[var(--color-brand)] py-3 text-sm font-semibold text-[var(--color-white)] transition-opacity disabled:opacity-60"
              >
                {isSavingInfo ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="rounded-3xl bg-[var(--color-white)] p-5 shadow-[0_2px_16px_var(--shadow-black-008)]">
            <h2 className="mb-4 text-sm font-bold text-[var(--color-carbon)]">Contraseña</h2>
            <form className="space-y-3" onSubmit={handleUpdatePassword}>
              <PasswordField
                id="current-password"
                label="Contraseña actual"
                value={currentPassword}
                onChange={setCurrentPassword}
                required
              />
              <PasswordField
                id="new-password"
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                minLength={6}
                required
              />
              <PasswordField
                id="confirm-password"
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                minLength={6}
                required
              />

              <Feedback error={passwordError} success={passwordSuccess} />

              <button
                type="submit"
                disabled={!canSubmitPassword}
                className="w-full rounded-2xl bg-[var(--color-carbon)] py-3 text-sm font-semibold text-[var(--color-white)] transition-opacity disabled:opacity-40"
              >
                {isSavingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>
          </div>

          {/* Sign out */}
          <div className="rounded-3xl bg-[var(--color-white)] p-5 shadow-[0_2px_16px_var(--shadow-black-008)]">
            <SignOutButton className="w-full rounded-2xl border-2 border-red-100 bg-red-50 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100" />
          </div>

        </div>
      </div>

      <BackHomeBottomNav fallbackHref="/" />
    </div>
  );
}
