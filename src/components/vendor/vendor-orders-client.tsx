"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OrdersIcon } from "@/components/icons";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  VENDOR_ORDER_STATUSES,
  VENDOR_ORDER_TRANSITIONS,
  type VendorOrderStatus,
} from "@/lib/vendor/constants";
import { fetchVendorOrders, updateVendorOrderStatus, verifyVendorOrderPayment } from "@/lib/vendor/client";
import { formatDateEsPr, formatUsd } from "@/lib/formatters";

type VendorOrder = Awaited<ReturnType<typeof fetchVendorOrders>>["orders"][number];

const STATUS_LABELS: Record<VendorOrderStatus, string> = {
  new: "Nueva",
  processing: "Procesando",
  shipped: "Enviada",
  delivered: "Entregada",
  canceled: "Cancelada",
};

const STATUS_DOT_COLOR: Record<VendorOrderStatus, string> = {
  new: "bg-[var(--vendor-status-new)]",
  processing: "bg-[var(--vendor-status-processing)]",
  shipped: "bg-[var(--vendor-status-shipped)]",
  delivered: "bg-[var(--vendor-status-delivered)]",
  canceled: "bg-[var(--vendor-status-canceled)]",
};

const STATUS_TEXT_COLOR: Record<VendorOrderStatus, string> = {
  new: "text-[var(--vendor-status-new)]",
  processing: "text-[var(--vendor-status-processing)]",
  shipped: "text-[var(--vendor-status-shipped)]",
  delivered: "text-[var(--vendor-status-delivered)]",
  canceled: "text-[var(--color-gray-500)]",
};

const TRANSITION_LABEL: Record<VendorOrderStatus, string> = {
  new: "Nueva",
  processing: "Procesar",
  shipped: "Marcar enviada",
  delivered: "Marcar entregada",
  canceled: "Cancelar",
};

const PAYMENT_LABELS: Record<string, string> = {
  requires_payment: "Pendiente de pago",
  awaiting_vendor_verification: "Verificar pago",
  paid: "Pagada",
  failed: "Pago rechazado",
  expired: "Pago expirado",
  refunded: "Reembolsada",
};

const PAYMENT_TEXT_COLOR: Record<string, string> = {
  requires_payment: "text-amber-600",
  awaiting_vendor_verification: "text-amber-600",
  paid: "text-[var(--vendor-status-delivered)]",
  failed: "text-[var(--color-danger)]",
  expired: "text-[var(--color-gray-500)]",
  refunded: "text-[var(--color-gray-500)]",
};

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

  const handlePaymentVerification = useCallback(
    async (orderId: string, action: "approve" | "reject") => {
      setIsSaving(true);
      setErrorMsg(null);
      try {
        await verifyVendorOrderPayment(orderId, action);
        await loadOrders();
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "No se pudo verificar el pago.");
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
          <div className="text-[var(--color-gray-500)]">
            <OrdersIcon className="h-12 w-12" />
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
            const nextStatuses =
              order.paymentStatus === "paid"
                ? VENDOR_ORDER_TRANSITIONS[currentStatus] ?? []
                : [];
            const buyer = order.buyer?.fullName || order.buyer?.email || "Cliente";
            const paymentLabel = PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus;
            const paymentTextColor = PAYMENT_TEXT_COLOR[order.paymentStatus] ?? "text-[var(--color-gray-500)]";
            const needsAthVerification = order.paymentStatus === "awaiting_vendor_verification";

            return (
              <li key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                {/* Order header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-carbon)]">
                      #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">{buyer}</p>
                    {order.buyer?.phone ? (
                      <p className="text-xs text-[var(--color-gray-500)]">{order.buyer.phone}</p>
                    ) : null}
                    <p className="text-xs text-[var(--color-gray-500)]">{formatDateEsPr(order.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TEXT_COLOR[currentStatus]}`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_COLOR[currentStatus]}`} />
                      {STATUS_LABELS[currentStatus]}
                    </span>
                    <span className={`text-xs font-medium ${paymentTextColor}`}>
                      {paymentLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-[var(--color-gray-100,#f9fafb)] px-3 py-2 text-xs text-[var(--color-gray-500)]">
                  <p>
                    {order.fulfillmentMethod === "pickup" ? "Recogido" : "Envío"} ·{" "}
                    {order.paymentMethod === "stripe" ? "Stripe" : "ATH Móvil"}
                  </p>
                  {order.fulfillmentMethod === "shipping" && order.shipping.address ? (
                    <p className="mt-1">{order.shipping.address}{order.shipping.zipCode ? ` · ${order.shipping.zipCode}` : ""}</p>
                  ) : null}
                  {order.fulfillmentMethod === "pickup" && order.shipping.pickupNotes ? (
                    <p className="mt-1">{order.shipping.pickupNotes}</p>
                  ) : null}
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

                {needsAthVerification && order.payment?.receiptUrl ? (
                  <div className="mt-3 rounded-2xl border border-[var(--vendor-card-border)] bg-white p-3">
                    <p className="mb-2 text-xs font-bold text-amber-700">
                      Verificar pago — ATH Móvil
                    </p>
                    <a
                      href={order.payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border border-[var(--vendor-card-border)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.payment.receiptUrl}
                        alt="Recibo ATH Móvil"
                        className="max-h-48 w-full object-contain"
                        loading="lazy"
                      />
                    </a>
                    {order.payment.receiptNote ? (
                      <p className="mt-2 text-xs text-[var(--color-gray-500)]">
                        Nota del cliente: {order.payment.receiptNote}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handlePaymentVerification(order.id, "approve")}
                        className="flex-1 rounded-full bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-60"
                      >
                        Aprobar pago
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handlePaymentVerification(order.id, "reject")}
                        className="flex-1 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-opacity hover:opacity-80 disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ) : order.payment?.receiptUrl ? (
                  <div className="mt-3">
                    <a
                      href={order.payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border border-[var(--color-gray-100,#f3f4f6)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.payment.receiptUrl}
                        alt="Recibo ATH Móvil"
                        className="max-h-36 w-full object-contain"
                        loading="lazy"
                      />
                    </a>
                    {order.payment.receiptNote ? (
                      <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                        {order.payment.receiptNote}
                      </p>
                    ) : null}
                  </div>
                ) : needsAthVerification ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handlePaymentVerification(order.id, "approve")}
                      className="rounded-full bg-[var(--color-carbon)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Aprobar pago
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handlePaymentVerification(order.id, "reject")}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
                    >
                      Rechazar pago
                    </button>
                  </div>
                ) : null}

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
