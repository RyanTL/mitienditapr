import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

type ProductRow = {
  id: string;
};

type OrderItemRow = {
  order_id: string;
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
  unit_price_usd: number;
};

type OrderRow = {
  id: string;
  profile_id: string;
  status: string;
  vendor_status: string;
  subtotal_usd: number;
  total_usd: number;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type ProductNameRow = {
  id: string;
  name: string;
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
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);

    const { data: productRows, error: productError } = await dataClient
      .from("products")
      .select("id")
      .eq("shop_id", shop.id);

    if (productError) {
      throw new Error(productError.message);
    }

    const productIds = ((productRows ?? []) as ProductRow[]).map((row) => row.id);
    if (productIds.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const { data: orderItemRows, error: orderItemsError } = await dataClient
      .from("order_items")
      .select("order_id,product_id,product_variant_id,quantity,unit_price_usd")
      .in("product_id", productIds);

    if (orderItemsError) {
      throw new Error(orderItemsError.message);
    }

    const items = (orderItemRows ?? []) as OrderItemRow[];
    if (items.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = Array.from(new Set(items.map((item) => item.order_id)));
    const [{ data: orderRows, error: ordersError }, { data: productNameRows, error: productNameError }] =
      await Promise.all([
        dataClient
          .from("orders")
          .select("id,profile_id,status,vendor_status,subtotal_usd,total_usd,created_at")
          .in("id", orderIds)
          .order("created_at", { ascending: false }),
        dataClient.from("products").select("id,name").in("id", productIds),
      ]);

    if (ordersError || !orderRows) {
      throw new Error(ordersError?.message ?? "No se pudieron cargar ordenes.");
    }

    if (productNameError || !productNameRows) {
      throw new Error(productNameError?.message ?? "No se pudieron cargar productos.");
    }

    const buyerIds = Array.from(
      new Set((orderRows as OrderRow[]).map((row) => row.profile_id)),
    );
    const { data: buyerRows, error: buyersError } = await dataClient
      .from("profiles")
      .select("id,email,full_name")
      .in("id", buyerIds);

    if (buyersError || !buyerRows) {
      throw new Error(buyersError?.message ?? "No se pudo cargar compradores.");
    }

    const itemsByOrder = new Map<string, OrderItemRow[]>();
    items.forEach((item) => {
      const currentItems = itemsByOrder.get(item.order_id) ?? [];
      itemsByOrder.set(item.order_id, [...currentItems, item]);
    });

    const productNameById = new Map(
      (productNameRows as ProductNameRow[]).map((row) => [row.id, row.name]),
    );
    const buyerById = new Map((buyerRows as ProfileRow[]).map((row) => [row.id, row]));

    const serializedOrders = (orderRows as OrderRow[]).map((order) => {
      const buyer = buyerById.get(order.profile_id) ?? null;
      const orderItems = itemsByOrder.get(order.id) ?? [];

      return {
        id: order.id,
        buyer: buyer
          ? {
              id: buyer.id,
              email: buyer.email,
              fullName: buyer.full_name,
            }
          : null,
        status: order.status,
        vendorStatus: order.vendor_status ?? "new",
        subtotalUsd: Number(order.subtotal_usd),
        totalUsd: Number(order.total_usd),
        createdAt: order.created_at,
        items: orderItems.map((item) => ({
          productId: item.product_id,
          productVariantId: item.product_variant_id,
          productName: productNameById.get(item.product_id) ?? "Producto",
          quantity: item.quantity,
          unitPriceUsd: Number(item.unit_price_usd),
        })),
      };
    });

    return NextResponse.json({ orders: serializedOrders });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar tus ordenes.");
  }
}
