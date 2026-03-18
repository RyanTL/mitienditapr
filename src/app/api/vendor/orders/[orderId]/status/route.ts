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

type ProductRow = {
  id: string;
};

type OrderRow = {
  id: string;
  status: string;
  vendor_status: VendorOrderStatus | null;
  profile_id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
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
    return badRequestResponse("Order id invalido.");
  }

  const body = await parseJsonBody<StatusPayload>(request);
  const nextStatus = body?.status;
  if (!nextStatus || !isVendorOrderStatus(nextStatus)) {
    return badRequestResponse("Estado de orden invalido.");
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);

    const { data: productRows, error: productsError } = await dataClient
      .from("products")
      .select("id")
      .eq("shop_id", shop.id);

    if (productsError) {
      throw new Error(productsError.message);
    }

    const productIds = ((productRows ?? []) as ProductRow[]).map((row) => row.id);
    if (productIds.length === 0) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    const { data: relatedOrderItem, error: relatedOrderError } = await dataClient
      .from("order_items")
      .select("order_id")
      .eq("order_id", orderId)
      .in("product_id", productIds)
      .limit(1)
      .maybeSingle();

    if (relatedOrderError) {
      throw new Error(relatedOrderError.message);
    }

    if (!relatedOrderItem) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    const { data: orderData, error: orderError } = await dataClient
      .from("orders")
      .select("id,status,vendor_status,profile_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message);
    }

    const order = orderData as OrderRow | null;
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    const currentStatus = order.vendor_status ?? "new";
    if (currentStatus !== nextStatus) {
      const allowedStatuses = VENDOR_ORDER_TRANSITIONS[currentStatus];
      if (!allowedStatuses.includes(nextStatus)) {
        return badRequestResponse(
          `Transicion invalida: ${currentStatus} -> ${nextStatus}.`,
        );
      }
    }

    const orderUpdates: Record<string, unknown> = {
      vendor_status: nextStatus,
    };

    if (nextStatus === "canceled") {
      orderUpdates.status = "cancelled";
    } else if (nextStatus === "delivered") {
      orderUpdates.status = "fulfilled";
    }

    const { error: updateError } = await dataClient
      .from("orders")
      .update(orderUpdates)
      .eq("id", order.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Notify buyer of status changes that are meaningful to them
    const buyerNotifiableStatuses = ["processing", "shipped", "delivered", "canceled"] as const;
    type BuyerNotifiableStatus = (typeof buyerNotifiableStatuses)[number];
    const isBuyerNotifiable = (s: string): s is BuyerNotifiableStatus =>
      (buyerNotifiableStatuses as readonly string[]).includes(s);

    if (isBuyerNotifiable(nextStatus) && order.profile_id) {
      const { data: buyerData } = await dataClient
        .from("profiles")
        .select("id,email,full_name")
        .eq("id", order.profile_id)
        .maybeSingle();

      const buyer = buyerData as ProfileRow | null;
      if (buyer?.email) {
        void sendBuyerOrderStatusEmail({
          to: buyer.email,
          buyerName: buyer.full_name ?? null,
          orderId: order.id,
          shopName: shop.vendor_name,
          newStatus: nextStatus,
        });
      }
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
