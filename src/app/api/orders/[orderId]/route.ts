import { NextResponse } from "next/server";

import { createReceiptSignedUrl } from "@/lib/orders/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  profile_id: string;
  shop_id: string;
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
  shops: {
    id: string;
    slug: string;
    vendor_name: string;
    vendor_profile_id: string;
  } | null;
};

type PaymentRow = {
  provider: string;
  status: string;
  receipt_image_bucket: string | null;
  receipt_image_path: string | null;
  receipt_note: string | null;
  failed_reason: string | null;
  verified_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
};

type ItemRow = {
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
  unit_price_usd: number;
  products: Array<{
    name: string;
    image_url: string | null;
  }> | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Orden inválida." }, { status: 400 });
  }

  let admin = supabase;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    // Development fallback.
  }

  const [{ data: orderData, error: orderError }, { data: paymentData, error: paymentError }, { data: itemData, error: itemError }] =
    await Promise.all([
      admin
        .from("orders")
        .select(
          "id,profile_id,shop_id,status,vendor_status,payment_status,payment_method,subtotal_usd,shipping_fee_usd,tax_usd,total_usd,fulfillment_method,buyer_name,buyer_email,buyer_phone,shipping_address,shipping_zip_code,pickup_notes,created_at,shops(id,slug,vendor_name,vendor_profile_id)",
        )
        .eq("id", orderId)
        .maybeSingle(),
      admin
        .from("order_payments")
        .select(
          "provider,status,receipt_image_bucket,receipt_image_path,receipt_note,failed_reason,verified_at,stripe_checkout_session_id,stripe_payment_intent_id",
        )
        .eq("order_id", orderId)
        .maybeSingle(),
      admin
        .from("order_items")
        .select("product_id,product_variant_id,quantity,unit_price_usd,products(name,image_url)")
        .eq("order_id", orderId),
    ]);

  if (orderError) {
    console.error("[orders] Failed to load order:", orderError);
    return NextResponse.json({ error: "No se pudo cargar la orden." }, { status: 500 });
  }

  if (paymentError) {
    console.error("[orders] Failed to load payment:", paymentError);
    return NextResponse.json({ error: "No se pudo cargar la orden." }, { status: 500 });
  }

  if (itemError) {
    console.error("[orders] Failed to load items:", itemError);
    return NextResponse.json({ error: "No se pudo cargar la orden." }, { status: 500 });
  }

  const order = orderData as OrderRow | null;
  if (!order?.shops) {
    return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
  }

  const isBuyer = order.profile_id === user.id;
  const isVendor = order.shops.vendor_profile_id === user.id;
  if (!isBuyer && !isVendor) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payment = paymentData as PaymentRow | null;
  const receiptUrl = await createReceiptSignedUrl(
    admin,
    payment?.receipt_image_bucket,
    payment?.receipt_image_path,
  ).catch(() => null);

  return NextResponse.json({
    order: {
      id: order.id,
      status: order.status,
      vendorStatus: order.vendor_status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      subtotalUsd: Number(order.subtotal_usd),
      shippingFeeUsd: Number(order.shipping_fee_usd),
      taxUsd: Number(order.tax_usd),
      totalUsd: Number(order.total_usd),
      fulfillmentMethod: order.fulfillment_method,
      createdAt: order.created_at,
      buyer: {
        name: order.buyer_name,
        email: order.buyer_email,
        phone: order.buyer_phone,
      },
      shipping: {
        address: order.shipping_address,
        zipCode: order.shipping_zip_code,
        pickupNotes: order.pickup_notes,
      },
      shop: {
        id: order.shops.id,
        slug: order.shops.slug,
        vendorName: order.shops.vendor_name,
      },
      payment: payment
        ? {
            provider: payment.provider,
            status: payment.status,
            receiptUrl,
            receiptNote: payment.receipt_note,
            failedReason: payment.failed_reason,
            verifiedAt: payment.verified_at,
            stripeCheckoutSessionId: payment.stripe_checkout_session_id,
            stripePaymentIntentId: payment.stripe_payment_intent_id,
          }
        : null,
      items: ((itemData ?? []) as unknown as ItemRow[]).map((item) => ({
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        name: item.products?.[0]?.name ?? "Producto",
        imageUrl: item.products?.[0]?.image_url ?? null,
        quantity: item.quantity,
        unitPriceUsd: Number(item.unit_price_usd),
      })),
    },
  });
}
