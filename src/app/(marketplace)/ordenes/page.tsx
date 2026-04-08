import Image from "next/image";
import Link from "next/link";

import { OrdersIcon } from "@/components/icons";
import { BackHomeBottomNav } from "@/components/navigation/back-home-bottom-nav";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { FloatingSearchButton } from "@/components/navigation/floating-search-button";
import { formatDateEsPr, formatUsd } from "@/lib/formatters";
import { type OrderPaymentStatus } from "@/lib/orders/constants";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { CancelOrderButton } from "./cancel-order-button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrderRow = {
  id: string;
  shop_id: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  vendor_status: "new" | "processing" | "shipped" | "delivered" | "canceled";
  payment_status: OrderPaymentStatus;
  payment_method: "stripe" | "ath_movil" | null;
  total_usd: number;
  created_at: string;
  shops: Array<{
    id: string;
    vendor_name: string;
    slug: string;
  }> | null;
};

type OrderItemRow = {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_usd: number;
  products: Array<{
    id: string;
    name: string;
    image_url: string | null;
  }> | null;
};

type DisplayOrder = {
  id: string;
  shortId: string;
  status: OrderRow["status"];
  statusLabel: string;
  statusColor: string;
  shopName: string;
  shopSlug: string;
  totalUsd: number;
  date: string;
  canCancel: boolean;
  items: Array<{
    name: string;
    imageUrl: string | null;
    quantity: number;
  }>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const IN_PROGRESS_STATUSES = new Set<OrderRow["status"]>(["pending", "paid"]);

function getStatusDisplay(
  status: OrderRow["status"],
  vendorStatus: OrderRow["vendor_status"],
  paymentStatus: OrderRow["payment_status"],
): { label: string; color: string } {
  if (paymentStatus === "awaiting_vendor_verification")
    return { label: "Verificando pago", color: "bg-amber-50 text-amber-700" };
  if (paymentStatus === "requires_payment")
    return { label: "Pendiente de pago", color: "bg-amber-50 text-amber-700" };
  if (paymentStatus === "failed")
    return { label: "Pago rechazado", color: "bg-red-50 text-red-700" };
  if (paymentStatus === "expired")
    return { label: "Pago expirado", color: "bg-gray-100 text-gray-500" };
  if (status === "fulfilled")
    return { label: "Entregada", color: "bg-emerald-50 text-emerald-700" };
  if (status === "cancelled")
    return { label: "Cancelada", color: "bg-gray-100 text-gray-500" };
  if (status === "refunded")
    return { label: "Reembolsada", color: "bg-gray-100 text-gray-500" };
  if (vendorStatus === "shipped")
    return { label: "En camino", color: "bg-indigo-50 text-indigo-700" };
  if (vendorStatus === "processing")
    return { label: "En preparación", color: "bg-blue-50 text-blue-700" };
  if (status === "paid")
    return { label: "Pagada", color: "bg-emerald-50 text-emerald-700" };
  return { label: "Pendiente", color: "bg-amber-50 text-amber-700" };
}

/* ------------------------------------------------------------------ */
/*  Data loader                                                        */
/* ------------------------------------------------------------------ */

const EMPTY = { activeOrders: [] as DisplayOrder[], pastOrders: [] as DisplayOrder[] };

async function loadOrdersForCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return EMPTY;

  let dataClient = supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Development fallback.
  }

  const { data: ordersData } = await dataClient
    .from("orders")
    .select(
      "id,shop_id,status,vendor_status,payment_status,payment_method,total_usd,created_at,shops(id,vendor_name,slug)",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (!ordersData?.length) return EMPTY;

  const orders = ordersData as unknown as OrderRow[];
  const orderIds = orders.map((o) => o.id);

  const { data: orderItemsData } = await dataClient
    .from("order_items")
    .select("order_id,product_id,quantity,unit_price_usd,products(id,name,image_url)")
    .in("order_id", orderIds);

  if (!orderItemsData) return EMPTY;

  const orderItems = orderItemsData as unknown as OrderItemRow[];

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of orderItems) {
    const arr = itemsByOrder.get(item.order_id) ?? [];
    arr.push(item);
    itemsByOrder.set(item.order_id, arr);
  }

  const allOrders: DisplayOrder[] = orders.flatMap((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const shopInfo = order.shops?.[0] ?? null;
    if (!shopInfo) return [];

    const { label, color } = getStatusDisplay(
      order.status,
      order.vendor_status,
      order.payment_status,
    );
    const canCancel =
      order.vendor_status === "new" &&
      (
        order.payment_status === "requires_payment" ||
        order.payment_status === "awaiting_vendor_verification" ||
        (order.payment_status === "paid" && order.payment_method === "stripe")
      );

    return [
      {
        id: order.id,
        shortId: order.id.slice(-6).toUpperCase(),
        status: order.status,
        statusLabel: label,
        statusColor: color,
        shopName: shopInfo.vendor_name,
        shopSlug: shopInfo.slug,
        totalUsd: Number(order.total_usd),
        date: formatDateEsPr(order.created_at, { day: "numeric", month: "short" }),
        canCancel,
        items: items.map((item) => {
          return {
            name: item.products?.[0]?.name ?? "Producto",
            imageUrl: item.products?.[0]?.image_url ?? null,
            quantity: item.quantity,
          };
        }),
      },
    ];
  });

  return {
    activeOrders: allOrders.filter((order) => {
      if (!IN_PROGRESS_STATUSES.has(order.status)) {
        return false;
      }
      return order.statusLabel !== "Pago rechazado" && order.statusLabel !== "Pago expirado";
    }),
    pastOrders: allOrders.filter((order) => {
      if (!IN_PROGRESS_STATUSES.has(order.status)) {
        return true;
      }
      return order.statusLabel === "Pago rechazado" || order.statusLabel === "Pago expirado";
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Order card                                                         */
/* ------------------------------------------------------------------ */

function OrderCard({ order }: { order: DisplayOrder }) {
  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="min-w-0">
          <Link
            href={`/${order.shopSlug}`}
            className="block truncate text-sm font-bold text-[var(--color-carbon)] hover:underline"
          >
            {order.shopName}
          </Link>
          <p className="mt-0.5 text-xs text-[var(--color-gray-500)]">
            #{order.shortId} &middot; {order.date}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${order.statusColor}`}
        >
          {order.statusLabel}
        </span>
      </div>

      {/* Items */}
      <div className="border-t border-[var(--color-gray-100)] px-4 py-3">
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--color-gray-100)]">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-carbon)]">
                {item.name}
              </span>
              <span className="shrink-0 text-xs text-[var(--color-gray-500)]">x{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-gray-100)] px-4 py-3">
        <p className="text-sm text-[var(--color-carbon)]">
          <span className="text-[var(--color-gray-500)]">
            {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
          </span>
          <span className="mx-1.5 text-[var(--color-gray-300)]">&middot;</span>
          <span className="font-bold">{formatUsd(order.totalUsd)}</span>
        </p>
        {order.canCancel && <CancelOrderButton orderId={order.id} />}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function OrdersPage() {
  const { activeOrders, pastOrders } = await loadOrdersForCurrentUser();
  const hasNoOrders = activeOrders.length === 0 && pastOrders.length === 0;

  return (
    <div className="min-h-screen bg-[var(--color-gray)] pb-36 lg:pb-8">
      <main className="mx-auto w-full max-w-md px-4 pt-6 md:max-w-3xl md:px-5 lg:max-w-4xl">
        <h1 className="mb-6 text-[2rem] font-extrabold leading-none tracking-tight text-[var(--color-carbon)]">
          Órdenes
        </h1>

        {hasNoOrders ? (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] px-6 py-16 text-center shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-gray-100)] text-[var(--color-gray-500)]">
              <OrdersIcon className="h-7 w-7" />
            </span>
            <p className="text-lg font-bold text-[var(--color-carbon)]">No tienes órdenes</p>
            <p className="mt-1 text-sm text-[var(--color-gray-500)]">
              Cuando realices una compra, aparecerá aquí.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center rounded-full bg-[var(--color-carbon)] px-6 py-3 text-sm font-semibold text-[var(--color-white)] transition-opacity hover:opacity-80"
            >
              Explorar tiendas
            </Link>
          </section>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-gray-500)]">
                  En proceso ({activeOrders.length})
                </h2>
                <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                  {activeOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}

            {pastOrders.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-gray-500)]">
                  Historial ({pastOrders.length})
                </h2>
                <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                  {pastOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BackHomeBottomNav />
      <FloatingSearchButton href="/" />
      <FloatingCartLink href="/carrito" resolveFromCart />
    </div>
  );
}
