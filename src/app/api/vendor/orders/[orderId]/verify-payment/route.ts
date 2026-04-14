import { NextResponse } from "next/server";

import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  releaseOrderInventory,
  updateOrderPaymentState,
} from "@/lib/orders/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendBuyerPaymentUpdateEmail } from "@/lib/email/resend";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

type VerifyPaymentPayload = {
  action?: "approve" | "reject";
};

type OrderRow = {
  id: string;
  payment_method: string | null;
  payment_status: string;
  buyer_email: string | null;
  buyer_name: string | null;
};

export async function POST(
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

  const body = await parseJsonBody<VerifyPaymentPayload>(request);
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return badRequestResponse("Acción de verificación inválida.");
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

    const { data: orderData, error: orderError } = await dataClient
      .from("orders")
      .select("id,payment_method,payment_status,buyer_email,buyer_name")
      .eq("id", orderId)
      .eq("shop_id", shop.id)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message);
    }

    const order = orderData as OrderRow | null;
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    if (order.payment_method !== "ath_movil") {
      return badRequestResponse("Solo puedes verificar pagos de ATH Móvil aquí.");
    }

    if (order.payment_status !== "awaiting_vendor_verification") {
      return badRequestResponse("Esta orden ya no está pendiente de verificación.");
    }

    const verifiedAt = new Date().toISOString();
    if (action === "approve") {
      await updateOrderPaymentState({
        admin: dataClient,
        orderId: order.id,
        paymentStatus: "paid",
        orderStatus: "paid",
        verifiedByProfileId: profile.id,
        verifiedAt,
      });
    } else {
      await updateOrderPaymentState({
        admin: dataClient,
        orderId: order.id,
        paymentStatus: "failed",
        orderStatus: "cancelled",
        vendorStatus: "canceled",
        failedReason: "ath_receipt_rejected",
        verifiedByProfileId: profile.id,
        verifiedAt,
      });

      await releaseOrderInventory(dataClient, order.id);
    }

    if (order.buyer_email) {
      void sendBuyerPaymentUpdateEmail({
        to: order.buyer_email,
        buyerName: order.buyer_name,
        orderId: order.id,
        shopName: shop.vendor_name,
        paymentStatus: action === "approve" ? "paid" : "failed",
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      paymentStatus: action === "approve" ? "paid" : "failed",
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo verificar el pago.");
  }
}
