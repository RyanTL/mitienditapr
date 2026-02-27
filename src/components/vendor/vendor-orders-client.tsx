"use client";

import { useCallback, useEffect, useState } from "react";

import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  VENDOR_ORDER_TRANSITIONS,
  type VendorOrderStatus,
} from "@/lib/vendor/constants";
import { fetchVendorOrders, updateVendorOrderStatus } from "@/lib/vendor/client";

type VendorOrder = Awaited<ReturnType<typeof fetchVendorOrders>>["orders"][number];

const STATUS_LABELS: Record<VendorOrderStatus, string> = {
  new: "Nueva",
  processing: "Procesando",
  shipped: "Enviada",
  delivered: "Entregada",
  canceled: "Cancelada",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function VendorOrdersClient() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchVendorOrders();
      setOrders(response.orders);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar pedidos.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleStatusUpdate = useCallback(
    async (orderId: string, status: VendorOrderStatus) => {
      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await updateVendorOrderStatus(orderId, status);
        setFeedbackMessage("Estado actualizado.");
        await loadOrders();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo actualizar el estado.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadOrders],
  );

  return (
    <VendorPageShell
      title="Pedidos"
      subtitle="Gestion manual del flujo de ordenes."
    >
      {feedbackMessage ? (
        <article className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-brand)]">
          {feedbackMessage}
        </article>
      ) : null}
      {errorMessage ? (
        <article className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </article>
      ) : null}

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        {isLoading ? (
          <p className="text-sm text-[var(--color-gray-500)]">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-[var(--color-gray-500)]">
            Aun no has recibido pedidos.
          </p>
        ) : (
          <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {orders.map((order) => {
              const currentStatus = order.vendorStatus;
              const nextStatuses = VENDOR_ORDER_TRANSITIONS[currentStatus] ?? [];

              return (
                <li
                  key={order.id}
                  className="rounded-2xl border border-[var(--color-gray)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">Orden #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        {order.buyer?.fullName || order.buyer?.email || "Cliente"}
                      </p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-gray-100)] px-2 py-1 text-xs font-semibold">
                      {STATUS_LABELS[currentStatus]}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 text-xs text-[var(--color-gray-500)]">
                    {order.items.map((item) => (
                      <li key={`${order.id}:${item.productId}:${item.productVariantId ?? "na"}`}>
                        {item.productName} • x{item.quantity} • ${item.unitPriceUsd.toFixed(2)}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-sm font-semibold">
                    Total: ${order.totalUsd.toFixed(2)}
                  </p>

                  {nextStatuses.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextStatuses.map((status) => (
                        <button
                          key={`${order.id}:${status}`}
                          type="button"
                          className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                          disabled={isSaving}
                          onClick={() => void handleStatusUpdate(order.id, status)}
                        >
                          Marcar {STATUS_LABELS[status].toLowerCase()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </VendorPageShell>
  );
}
