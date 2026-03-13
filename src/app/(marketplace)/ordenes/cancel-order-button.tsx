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
        className="text-xs font-medium text-[var(--color-white)] underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Cancelando..." : "Cancelar orden"}
      </button>
      {error && <p className="mt-0.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}
