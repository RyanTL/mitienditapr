"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OrdersIcon } from "@/components/icons";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  VENDOR_ORDER_STATUSES,
  VENDOR_ORDER_TRANSITIONS,
  type VendorOrderStatus,
} from "@/lib/vendor/constants";
import { fetchVendorOrders, updateVendorOrderStatus } from "@/lib/vendor/client";
import { formatUsd } from "@/lib/formatters";

type VendorOrder = Awaited<ReturnType<typeof fetchVendorOrders>>["orders"][number];

const STATUS_LABELS: Record<VendorOrderStatus, string> = {
  new: "Nueva",
  processing: "Procesando",
  shipped: "Enviada",
  delivered: "Entregada",
  canceled: "Cancelada",
};

const STATUS_BADGE: Record<VendorOrderStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  canceled: "bg-gray-100 text-gray-500",
};

const TRANSITION_LABEL: Record<VendorOrderStatus, string> = {
  new: "Nueva",
  processing: "Procesar",
  shipped: "Marcar enviada",
  delivered: "Marcar entregada",
  canceled: "Cancelar",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type FilterValue = VendorOrderStatus | "all";

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  ...VENDOR_ORDER_STATUSES.map((s) => ({ value: s as FilterValue, label: STATUS_LABELS[s] })),
];

export function VendorOrdersClient() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchVendorOrders();
      setOrders(res.orders);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudieron cargar pedidos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const handleStatusUpdate = useCallback(
    async (orderId: string, status: VendorOrderStatus) => {
      setIsSaving(true);
      setErrorMsg(null);
      try {
        await updateVendorOrderStatus(orderId, status);
        await loadOrders();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
      } finally {
        setIsSaving(false);
      }
    },
    [loadOrders],
  );

  const filteredOrders = useMemo(
    () =>
      activeFilter === "all"
        ? orders
        : orders.filter((o) => o.vendorStatus === activeFilter),
    [orders, activeFilter],
  );

  // Count badge for "new" filter pill
  const newCount = orders.filter((o) => o.vendorStatus === "new").length;

  return (
    <VendorPageShell title="Pedidos">
      {errorMsg && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {/* Filter pills */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2 pb-1">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveFilter(value)}
              className={[
                "relative flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                activeFilter === value
                  ? "bg-[var(--color-carbon)] text-white"
                  : "bg-white text-[var(--color-gray-500)] hover:text-[var(--color-carbon)]",
              ].join(" ")}
            >
              {label}
              {value === "new" && newCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[var(--color-carbon)] shadow-sm">
            <OrdersIcon className="h-9 w-9" />
          </div>
          <p className="font-semibold text-[var(--color-carbon)]">
            {activeFilter === "all" ? "Sin pedidos todavía" : `Sin pedidos ${STATUS_LABELS[activeFilter as VendorOrderStatus]?.toLowerCase() ?? ""}`}
          </p>
          <p className="text-sm text-[var(--color-gray-500)]">
            Comparte tu tienda para empezar a recibir pedidos.
          </p>
        </div>
      ) : (
        <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {filteredOrders.map((order) => {
            const currentStatus = order.vendorStatus;
            const nextStatuses = VENDOR_ORDER_TRANSITIONS[currentStatus] ?? [];
            const buyer = order.buyer?.fullName || order.buyer?.email || "Cliente";

            return (
              <li key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                {/* Order header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-carbon)]">
                      #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">{buyer}</p>
                    <p className="text-xs text-[var(--color-gray-500)]">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[currentStatus]}`}>
                    {STATUS_LABELS[currentStatus]}
                  </span>
                </div>

                {/* Items */}
                <ul className="mt-3 space-y-1 border-t border-[var(--color-gray-100,#f3f4f6)] pt-3">
                  {order.items.map((item) => (
                    <li
                      key={`${order.id}:${item.productId}:${item.productVariantId ?? "na"}`}
                      className="flex items-center justify-between text-xs text-[var(--color-gray-500)]"
                    >
                      <span className="truncate">
                        {item.productName}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </span>
                      <span className="ml-2 shrink-0 font-medium text-[var(--color-carbon)]">
                        {formatUsd(item.unitPriceUsd * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Total */}
                <div className="mt-2 flex items-center justify-between border-t border-[var(--color-gray-100,#f3f4f6)] pt-2">
                  <span className="text-xs font-semibold text-[var(--color-gray-500)]">Total</span>
                  <span className="text-sm font-bold text-[var(--color-carbon)]">
                    {formatUsd(order.totalUsd)}
                  </span>
                </div>

                {/* Status transitions */}
                {nextStatuses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                      <button
                        key={`${order.id}:${status}`}
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleStatusUpdate(order.id, status)}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60",
                          status === "canceled"
                            ? "border border-red-200 text-red-600 hover:bg-red-50"
                            : "bg-[var(--color-carbon)] text-white hover:opacity-80",
                        ].join(" ")}
                      >
                        {TRANSITION_LABEL[status]}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </VendorPageShell>
  );
}
