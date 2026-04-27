import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createReceiptSignedUrl } from "@/lib/orders/server";
import {
  HIDDEN_VENDOR_PAYMENT_STATUSES,
  type OrderPaymentStatus,
} from "@/lib/orders/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

type OrderRow = {
  id: string;
  profile_id: string;
  status: string;
  vendor_status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal_usd: number;
  shipping_fee_usd: number;
  tax_usd: number;
  total_usd: number;
  fulfillment_method: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  shipping_address: string | null;
  shipping_zip_code: string | null;
  pickup_notes: string | null;
  created_at: string;
};

type OrderPaymentRow = {
  order_id: string;
  provider: string;
  status: string;
  receipt_image_bucket: string | null;
  receipt_image_path: string | null;
  receipt_note: string | null;
  failed_reason: string | null;
  verified_at: string | null;
};

type OrderItemRow = {
  order_id: string;
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
  unit_price_usd: number;
  products: Array<{
    name: string;
    image_url: string | null;
  }> | null;
};

export async function GET() {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
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

    const { data: orderRows, error: orderError } = await dataClient
      .from("orders")
      .select(
        "id,profile_id,status,vendor_status,payment_status,payment_method,subtotal_usd,shipping_fee_usd,tax_usd,total_usd,fulfillment_method,buyer_name,buyer_email,buyer_phone,shipping_address,shipping_zip_code,pickup_notes,created_at",
      )
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      throw new Error(orderError.message);
    }

    const orders = ((orderRows ?? []) as OrderRow[]).filter(
      (order) =>
        !HIDDEN_VENDOR_PAYMENT_STATUSES.has(order.payment_status as OrderPaymentStatus),
    );

    if (orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = orders.map((order) => order.id);
    const [{ data: paymentRows, error: paymentError }, { data: itemRows, error: itemError }] =
      await Promise.all([
        dataClient
          .from("order_payments")
          .select(
            "order_id,provider,status,receipt_image_bucket,receipt_image_path,receipt_note,failed_reason,verified_at",
          )
          .in("order_id", orderIds),
        dataClient
          .from("order_items")
          .select(
            "order_id,product_id,product_variant_id,quantity,unit_price_usd,products(name,image_url)",
          )
          .in("order_id", orderIds),
      ]);

    if (paymentError) {
      throw new Error(paymentError.message);
    }

    if (itemError) {
      throw new Error(itemError.message);
    }

    const paymentsByOrderId = new Map(
      ((paymentRows ?? []) as OrderPaymentRow[]).map((row) => [row.order_id, row]),
    );
    const itemsByOrderId = ((itemRows ?? []) as unknown as OrderItemRow[]).reduce((map, row) => {
      const current = map.get(row.order_id) ?? [];
      map.set(row.order_id, [...current, row]);
      return map;
    }, new Map<string, OrderItemRow[]>());

    const receiptUrlEntries = await Promise.all(
      Array.from(paymentsByOrderId.entries()).map(async ([orderId, payment]) => {
        const receiptUrl = await createReceiptSignedUrl(
          dataClient,
          payment.receipt_image_bucket,
          payment.receipt_image_path,
        ).catch(() => null);

        return [orderId, receiptUrl] as const;
      }),
    );
    const receiptUrlByOrderId = new Map<string, string | null>(receiptUrlEntries);

    return NextResponse.json({
      orders: orders.map((order) => {
        const payment = paymentsByOrderId.get(order.id) ?? null;
        const orderItems = itemsByOrderId.get(order.id) ?? [];

        return {
          id: order.id,
          status: order.status,
          vendorStatus: order.vendor_status ?? "new",
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method ?? payment?.provider ?? null,
          subtotalUsd: Number(order.subtotal_usd),
          shippingFeeUsd: Number(order.shipping_fee_usd),
          taxUsd: Number(order.tax_usd),
          totalUsd: Number(order.total_usd),
          fulfillmentMethod: order.fulfillment_method,
          createdAt: order.created_at,
          buyer: {
            id: order.profile_id,
            email: order.buyer_email,
            fullName: order.buyer_name,
            phone: order.buyer_phone,
          },
          shipping: {
            address: order.shipping_address,
            zipCode: order.shipping_zip_code,
            pickupNotes: order.pickup_notes,
          },
          payment: payment
            ? {
                provider: payment.provider,
                status: payment.status,
                receiptUrl: receiptUrlByOrderId.get(order.id) ?? null,
                receiptNote: payment.receipt_note,
                failedReason: payment.failed_reason,
                verifiedAt: payment.verified_at,
              }
            : null,
          items: orderItems.map((item) => ({
            productId: item.product_id,
            productVariantId: item.product_variant_id,
            productName: item.products?.[0]?.name ?? "Producto",
            imageUrl: item.products?.[0]?.image_url ?? null,
            quantity: item.quantity,
            unitPriceUsd: Number(item.unit_price_usd),
          })),
        };
      }),
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar tus órdenes.");
  }
}
