"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { sendVendorOrderCancelledEmail } from "@/lib/email/resend";

type OrderWithShop = {
  id: string;
  profile_id: string;
  order_items: Array<{
    product_id: string;
    products: {
      shop_id: string;
      shops: {
        id: string;
        vendor_name: string;
        vendor_profile_id: string;
      } | null;
    } | null;
  }>;
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

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!order) {
    return { error: "Orden no encontrada o no se puede cancelar." };
  }

  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);

  if (error) {
    return { error: "No se pudo cancelar la orden." };
  }

  revalidatePath("/ordenes");

  // Notify vendor about the cancellation (fire and forget)
  void notifyVendorOfCancellation(orderId, user.id);

  return {};
}

async function notifyVendorOfCancellation(orderId: string, buyerProfileId: string): Promise<void> {
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return;
  }

  // Fetch the order with shop info via order_items → products → shops
  const { data: orderData } = await adminClient
    .from("orders")
    .select(
      "id,profile_id,order_items(product_id,products(shop_id,shops(id,vendor_name,vendor_profile_id)))",
    )
    .eq("id", orderId)
    .maybeSingle();

  const typedOrder = orderData as OrderWithShop | null;
  if (!typedOrder) return;

  // Extract the first shop found in the order
  const firstShop = typedOrder.order_items
    .map((oi) => oi.products?.shops)
    .find((s) => s != null);

  if (!firstShop?.vendor_profile_id) return;

  // Fetch vendor email
  const { data: vendorData } = await adminClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", firstShop.vendor_profile_id)
    .maybeSingle();

  const vendor = vendorData as ProfileRow | null;
  if (!vendor?.email) return;

  // Fetch buyer name
  const { data: buyerData } = await adminClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", buyerProfileId)
    .maybeSingle();

  const buyer = buyerData as ProfileRow | null;

  await sendVendorOrderCancelledEmail({
    to: vendor.email,
    vendorName: firstShop.vendor_name,
    orderId,
    buyerName: buyer?.full_name ?? null,
  });
}
