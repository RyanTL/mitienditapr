import { NextResponse } from "next/server";

import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  VENDOR_ORDER_STATUSES,
  VENDOR_ORDER_TRANSITIONS,
  type VendorOrderStatus,
} from "@/lib/vendor/constants";
import { createStripeRefund } from "@/lib/vendor/stripe";
import {
  releaseOrderInventory,
  updateOrderPaymentState,
} from "@/lib/orders/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendBuyerOrderStatusEmail } from "@/lib/email/resend";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

type StatusPayload = {
  status?: VendorOrderStatus;
};

type OrderRow = {
  id: string;
  status: string;
  vendor_status: VendorOrderStatus | null;
  payment_status: string;
  payment_method: string | null;
  profile_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
};

type PaymentRow = {
  stripe_payment_intent_id: string | null;
};

function isVendorOrderStatus(value: string): value is VendorOrderStatus {
  return (VENDOR_ORDER_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const { orderId } = await params;
  if (!orderId) {
    return badRequestResponse("Order id inválido.");
  }

  const body = await parseJsonBody<StatusPayload>(request);
  const nextStatus = body?.status;
  if (!nextStatus || !isVendorOrderStatus(nextStatus)) {
    return badRequestResponse("Estado de orden inválido.");
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Development fallback.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);

    const [{ data: orderData, error: orderError }, { data: paymentData, error: paymentError }] =
      await Promise.all([
        dataClient
          .from("orders")
          .select(
            "id,status,vendor_status,payment_status,payment_method,profile_id,buyer_email,buyer_name",
          )
          .eq("id", orderId)
          .eq("shop_id", shop.id)
          .maybeSingle(),
        dataClient
          .from("order_payments")
          .select("stripe_payment_intent_id")
          .eq("order_id", orderId)
          .maybeSingle(),
      ]);

    if (orderError) {
      throw new Error(orderError.message);
    }

    if (paymentError) {
      throw new Error(paymentError.message);
    }

    const order = orderData as OrderRow | null;
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    const payment = (paymentData as PaymentRow | null) ?? {
      stripe_payment_intent_id: null,
    };

    const currentStatus = order.vendor_status ?? "new";
    if (currentStatus !== nextStatus) {
      const allowedStatuses = VENDOR_ORDER_TRANSITIONS[currentStatus];
      if (!allowedStatuses.includes(nextStatus)) {
        return badRequestResponse(
          `Transición inválida: ${currentStatus} -> ${nextStatus}.`,
        );
      }
    }

    if (nextStatus !== "canceled" && order.payment_status !== "paid") {
      return badRequestResponse("La orden aún no tiene un pago confirmado.");
    }

    if (nextStatus === "canceled") {
      if (order.payment_method === "stripe" && order.payment_status === "paid") {
        if (!payment.stripe_payment_intent_id) {
          throw new Error("Falta el payment intent de Stripe para reembolsar la orden.");
        }

        await createStripeRefund({
          paymentIntentId: payment.stripe_payment_intent_id,
        });

        await updateOrderPaymentState({
          admin: dataClient,
          orderId: order.id,
          paymentStatus: "refunded",
          orderStatus: "refunded",
          vendorStatus: "canceled",
        });
      } else {
        await updateOrderPaymentState({
          admin: dataClient,
          orderId: order.id,
          paymentStatus: "failed",
          orderStatus: "cancelled",
          vendorStatus: "canceled",
          failedReason: "vendor_canceled_order",
        });
      }

      await releaseOrderInventory(dataClient, order.id);
    } else {
      const orderUpdates: Record<string, unknown> = {
        vendor_status: nextStatus,
      };

      if (nextStatus === "delivered") {
        orderUpdates.status = "fulfilled";
      }

      const { error: updateError } = await dataClient
        .from("orders")
        .update(orderUpdates)
        .eq("id", order.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    const buyerNotifiableStatuses = ["processing", "shipped", "delivered", "canceled"] as const;
    type BuyerNotifiableStatus = (typeof buyerNotifiableStatuses)[number];
    const isBuyerNotifiable = (value: string): value is BuyerNotifiableStatus =>
      (buyerNotifiableStatuses as readonly string[]).includes(value);

    if (isBuyerNotifiable(nextStatus) && order.buyer_email) {
      sendBuyerOrderStatusEmail({
        to: order.buyer_email,
        buyerName: order.buyer_name,
        orderId: order.id,
        shopName: shop.vendor_name,
        newStatus: nextStatus,
      }).catch((error) => {
        console.error("[email] failed to send buyer order status email", {
          orderId: order.id,
          error,
        });
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      previousStatus: currentStatus,
      status: nextStatus,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo actualizar la orden.");
  }
}
