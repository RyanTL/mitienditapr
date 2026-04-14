export const ORDER_PAYMENT_METHODS = ["stripe", "ath_movil"] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const ORDER_PAYMENT_STATUSES = [
  "requires_payment",
  "awaiting_vendor_verification",
  "paid",
  "failed",
  "expired",
  "refunded",
] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const ORDER_FULFILLMENT_METHODS = ["shipping", "pickup"] as const;
export type OrderFulfillmentMethod = (typeof ORDER_FULFILLMENT_METHODS)[number];

export const BUYER_VISIBLE_ORDER_PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  requires_payment: "Pendiente de pago",
  awaiting_vendor_verification: "Esperando verificación",
  paid: "Pagada",
  failed: "Pago rechazado",
  expired: "Pago expirado",
  refunded: "Reembolsada",
};

export const HIDDEN_VENDOR_PAYMENT_STATUSES = new Set<OrderPaymentStatus>([
  "requires_payment",
  "expired",
]);
