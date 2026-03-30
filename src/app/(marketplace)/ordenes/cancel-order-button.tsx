"use client";

import { useState } from "react";

import { cancelOrder } from "./actions";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!window.confirm("¿Seguro que quieres cancelar esta orden?")) return;

    setPending(true);
    setError(null);

    const result = await cancelOrder(orderId);

    if (result.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-full border border-[var(--color-gray-300)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-carbon)] transition-colors hover:bg-[var(--color-gray-100)] disabled:opacity-50"
      >
        {pending ? "Cancelando..." : "Cancelar"}
      </button>
      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
