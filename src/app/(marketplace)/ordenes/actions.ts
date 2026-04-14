"use server";

import { revalidatePath } from "next/cache";

import { createStripeRefund } from "@/lib/vendor/stripe";
import {
  releaseOrderInventory,
  updateOrderPaymentState,
} from "@/lib/orders/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { sendVendorOrderCancelledEmail } from "@/lib/email/resend";

type OrderRow = {
  id: string;
  profile_id: string;
  shop_id: string;
  status: string;
  vendor_status: string;
  payment_status: string;
  payment_method: string | null;
};

type PaymentRow = {
  stripe_payment_intent_id: string | null;
};

type ShopRow = {
  id: string;
  vendor_name: string;
  vendor_profile_id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export async function cancelOrder(orderId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado." };
  }

  let admin = supabase;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    // Development fallback.
  }

  const [{ data: orderData, error: orderError }, { data: paymentData, error: paymentError }] =
    await Promise.all([
      admin
        .from("orders")
        .select(
          "id,profile_id,shop_id,status,vendor_status,payment_status,payment_method",
        )
        .eq("id", orderId)
        .eq("profile_id", user.id)
        .maybeSingle(),
      admin
        .from("order_payments")
        .select("stripe_payment_intent_id")
        .eq("order_id", orderId)
        .maybeSingle(),
    ]);

  if (orderError) {
    return { error: "No se pudo cargar la orden." };
  }

  if (paymentError) {
    return { error: "No se pudo cargar el pago de la orden." };
  }

  const order = orderData as OrderRow | null;
  const payment = (paymentData as PaymentRow | null) ?? {
    stripe_payment_intent_id: null,
  };

  if (!order || order.vendor_status !== "new") {
    return { error: "Orden no encontrada o no se puede cancelar." };
  }

  try {
    if (order.payment_method === "stripe" && order.payment_status === "paid") {
      if (!payment.stripe_payment_intent_id) {
        return { error: "No se encontró el pago de Stripe para reembolsar esta orden." };
      }

      await createStripeRefund({
        paymentIntentId: payment.stripe_payment_intent_id,
      });

      await updateOrderPaymentState({
        admin,
        orderId,
        paymentStatus: "refunded",
        orderStatus: "refunded",
        vendorStatus: "canceled",
      });
    } else {
      await updateOrderPaymentState({
        admin,
        orderId,
        paymentStatus:
          order.payment_status === "refunded" ? "refunded" : "failed",
        orderStatus: "cancelled",
        vendorStatus: "canceled",
        failedReason: "buyer_canceled_order",
      });
    }

    await releaseOrderInventory(admin, orderId);
  } catch {
    return { error: "No se pudo cancelar la orden." };
  }

  revalidatePath("/ordenes");

  void notifyVendorOfCancellation(order.shop_id, user.id, orderId);

  return {};
}

async function notifyVendorOfCancellation(
  shopId: string,
  buyerProfileId: string,
  orderId: string,
): Promise<void> {
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return;
  }

  const [{ data: shopData }, { data: buyerData }] = await Promise.all([
    adminClient
      .from("shops")
      .select("id,vendor_name,vendor_profile_id")
      .eq("id", shopId)
      .maybeSingle(),
    adminClient
      .from("profiles")
      .select("id,email,full_name")
      .eq("id", buyerProfileId)
      .maybeSingle(),
  ]);

  const shop = shopData as ShopRow | null;
  const buyer = buyerData as ProfileRow | null;
  if (!shop?.vendor_profile_id) return;

  const { data: vendorData } = await adminClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", shop.vendor_profile_id)
    .maybeSingle();

  const vendor = vendorData as ProfileRow | null;
  if (!vendor?.email) return;

  await sendVendorOrderCancelledEmail({
    to: vendor.email,
    vendorName: shop.vendor_name,
    orderId,
    buyerName: buyer?.full_name ?? null,
  });
}
