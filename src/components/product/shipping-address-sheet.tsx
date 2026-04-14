"use client";

import { useState } from "react";

import { CloseIcon } from "@/components/icons";
import { updateAccountProfile, fetchAccountSnapshot } from "@/lib/account/client";

type ShippingAddressSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  initialZipCode: string;
  initialAddress: string;
  onSaved: (zipCode: string, address: string) => void;
};

export function ShippingAddressSheet({
  isOpen,
  onClose,
  initialZipCode,
  initialAddress,
  onSaved,
}: ShippingAddressSheetProps) {
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [address, setAddress] = useState(initialAddress);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    const trimmedZip = zipCode.trim();
    if (trimmedZip.length > 0 && !/^\d{5}$/.test(trimmedZip)) {
      setErrorMessage("El código postal debe tener 5 dígitos.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const snapshot = await fetchAccountSnapshot();
      await updateAccountProfile({
        fullName: snapshot.fullName,
        phone: snapshot.phone,
        address: address.trim(),
        zipCode: trimmedZip,
      });
      onSaved(trimmedZip, address.trim());
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar la dirección.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-055)]"
        onClick={onClose}
        aria-label="Cerrar"
      />

      <div className="relative mx-auto w-full max-w-md rounded-t-3xl bg-[var(--color-white)] p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:rounded-3xl">
        <button
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-lg font-bold text-[var(--color-carbon)]">
          Dirección de envío
        </h2>
        <p className="mb-5 text-sm text-[var(--color-gray-500)]">
          Agrega tu dirección para el envío de productos.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="sheet-zip"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-gray-500)]"
            >
              Código postal
            </label>
            <input
              id="sheet-zip"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="00XXX"
              className="w-full rounded-2xl bg-[var(--color-gray-100)] px-4 py-3 text-sm text-[var(--color-carbon)] outline-none border-2 border-transparent transition-colors placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="sheet-address"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-gray-500)]"
            >
              Dirección completa
            </label>
            <textarea
              id="sheet-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle, número, urbanización, ciudad"
              className="w-full resize-none rounded-2xl bg-[var(--color-gray-100)] px-4 py-3 text-sm text-[var(--color-carbon)] outline-none border-2 border-transparent transition-colors placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:bg-white"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="w-full rounded-full bg-[var(--color-brand)] py-3.5 text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80 disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : "Guardar dirección"}
          </button>
        </div>
      </div>
    </div>
  );
}
