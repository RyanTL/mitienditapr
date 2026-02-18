import Image from "next/image";

import {
  CartIcon,
  ChevronIcon,
  DotsIcon,
  HomeIcon,
  OrdersIcon,
} from "@/components/icons";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { FloatingSearchButton } from "@/components/navigation/floating-search-button";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { formatUsd } from "@/lib/formatters";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InProgressOrder = {
  id: string;
  title: string;
  imageUrl: string;
  alt: string;
  tag: string;
};

type PastOrder = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  alt: string;
};

type OrderRow = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  total_usd: number;
  created_at: string;
};

type OrderItemRow = {
  order_id: string;
  product_id: string;
  quantity: number;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  image_url: string;
};

type ShopRow = {
  id: string;
  vendor_name: string;
};

const IN_PROGRESS_STATUSES = new Set<OrderRow["status"]>(["pending", "paid"]);

function formatOrderDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-PR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildPastOrderTitle(status: OrderRow["status"], createdAt: string) {
  const date = formatOrderDate(createdAt);

  if (status === "fulfilled") {
    return `Entregada ${date}`;
  }

  if (status === "cancelled") {
    return `Cancelada ${date}`;
  }

  if (status === "refunded") {
    return `Reembolsada ${date}`;
  }

  return `Orden ${date}`;
}

function buildStatusTag(status: OrderRow["status"]) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "paid") {
    return "Pagada";
  }

  return "En proceso";
}

async function loadOrdersForCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      inProgressOrders: [] as InProgressOrder[],
      pastOrders: [] as PastOrder[],
    };
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select("id,status,total_usd,created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (ordersError || !ordersData || ordersData.length === 0) {
    return {
      inProgressOrders: [] as InProgressOrder[],
      pastOrders: [] as PastOrder[],
    };
  }

  const orders = ordersData as OrderRow[];
  const orderIds = orders.map((order) => order.id);

  const { data: orderItemsData, error: orderItemsError } = await supabase
    .from("order_items")
    .select("order_id,product_id,quantity")
    .in("order_id", orderIds);

  if (orderItemsError || !orderItemsData) {
    return {
      inProgressOrders: [] as InProgressOrder[],
      pastOrders: [] as PastOrder[],
    };
  }

  const orderItems = orderItemsData as OrderItemRow[];
  const productIds = Array.from(new Set(orderItems.map((item) => item.product_id)));
  if (productIds.length === 0) {
    return {
      inProgressOrders: [] as InProgressOrder[],
      pastOrders: [] as PastOrder[],
    };
  }

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id,shop_id,name,image_url")
    .in("id", productIds);

  if (productsError || !productsData) {
    return {
      inProgressOrders: [] as InProgressOrder[],
      pastOrders: [] as PastOrder[],
    };
  }

  const products = productsData as ProductRow[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const shopIds = Array.from(new Set(products.map((product) => product.shop_id)));

  const { data: shopsData, error: shopsError } = await supabase
    .from("shops")
    .select("id,vendor_name")
    .in("id", shopIds);

  if (shopsError || !shopsData) {
    return {
      inProgressOrders: [] as InProgressOrder[],
      pastOrders: [] as PastOrder[],
    };
  }

  const shopById = new Map((shopsData as ShopRow[]).map((shop) => [shop.id, shop]));
  const orderItemsByOrderId = new Map<string, OrderItemRow[]>();

  orderItems.forEach((item) => {
    const existingItems = orderItemsByOrderId.get(item.order_id) ?? [];
    orderItemsByOrderId.set(item.order_id, [...existingItems, item]);
  });

  const inProgressOrders = orders.flatMap((order) => {
    if (!IN_PROGRESS_STATUSES.has(order.status)) {
      return [];
    }

    const items = orderItemsByOrderId.get(order.id) ?? [];
    const firstProduct = items[0] ? productById.get(items[0].product_id) : null;
    if (!firstProduct) {
      return [];
    }

    return [
      {
        id: order.id,
        title: firstProduct.name,
        imageUrl: firstProduct.image_url,
        alt: firstProduct.name,
        tag: buildStatusTag(order.status),
      } satisfies InProgressOrder,
    ];
  });

  const pastOrders = orders.flatMap((order) => {
    if (IN_PROGRESS_STATUSES.has(order.status)) {
      return [];
    }

    const items = orderItemsByOrderId.get(order.id) ?? [];
    const firstProduct = items[0] ? productById.get(items[0].product_id) : null;
    if (!firstProduct) {
      return [];
    }

    const shop = shopById.get(firstProduct.shop_id);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const shopLabel = shop?.vendor_name ?? "Tienda";
    const itemsLabel = `${totalItems} ${totalItems === 1 ? "articulo" : "articulos"}`;

    return [
      {
        id: order.id,
        title: buildPastOrderTitle(order.status, order.created_at),
        subtitle: `${shopLabel} • ${itemsLabel} • ${formatUsd(Number(order.total_usd))}`,
        imageUrl: firstProduct.image_url,
        alt: firstProduct.name,
      } satisfies PastOrder,
    ];
  });

  return { inProgressOrders, pastOrders };
}

export default async function OrdersPage() {
  const { inProgressOrders, pastOrders } = await loadOrdersForCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--color-gray)] pb-36">
      <main className="mx-auto w-full max-w-md px-4 pt-6">
        <header className="mb-8 flex items-center justify-between">
          <div className="w-8" />
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-black)]">Ordenes</h1>
          <button type="button" className="text-[var(--color-black)]" aria-label="Mas opciones">
            <DotsIcon />
          </button>
        </header>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-3xl font-bold leading-none text-[var(--color-carbon)]">
              Compras en proceso
            </h2>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-gray-icon)] text-[var(--color-carbon)]">
              <ChevronIcon />
            </span>
          </div>

          {inProgressOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray-border)] bg-[var(--color-white)] px-4 py-7 text-sm text-[var(--color-carbon)]">
              No tienes compras en proceso.
            </div>
          ) : (
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
              {inProgressOrders.map((item) => (
                <article
                  key={item.id}
                  className="relative min-w-[170px] snap-start overflow-hidden rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)]"
                >
                  <div className="relative h-[170px]">
                    <Image
                      src={item.imageUrl}
                      alt={item.alt}
                      fill
                      className="object-cover"
                      sizes="170px"
                    />
                  </div>
                  <span className="absolute top-3 left-3 rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-xs font-semibold text-[var(--color-white)]">
                    {item.tag}
                  </span>
                  <button type="button"
                    className="absolute right-3 bottom-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-carbon)] text-[var(--color-white)]"
                    aria-label={`Agregar ${item.title} al carrito`}
                  >
                    <CartIcon />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-3xl font-bold leading-none text-[var(--color-carbon)]">
              Compras pasadas
            </h2>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-gray-icon)] text-[var(--color-carbon)]">
              <ChevronIcon />
            </span>
          </div>

          {pastOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray-border)] bg-[var(--color-white)] px-4 py-7 text-sm text-[var(--color-carbon)]">
              Aun no tienes compras pasadas.
            </div>
          ) : (
            <div className="space-y-4">
              {pastOrders.map((order) => (
                <article key={order.id} className="flex items-center gap-3">
                  <div className="relative h-[74px] w-[74px] overflow-hidden rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)]">
                    <Image
                      src={order.imageUrl}
                      alt={order.alt}
                      fill
                      className="object-cover"
                      sizes="74px"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold leading-none text-[var(--color-carbon)]">
                      {order.title}
                    </h3>
                    <p className="mt-1 truncate text-sm leading-none text-[var(--color-carbon)]">
                      {order.subtitle}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <TwoItemBottomNav
        containerClassName={FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS}
        firstItem={{
          ariaLabel: "Inicio",
          icon: <HomeIcon />,
          href: "/",
        }}
        secondItem={{
          ariaLabel: "Ordenes",
          icon: <OrdersIcon />,
          href: "/ordenes",
          isActive: true,
        }}
      />

      <FloatingSearchButton />
      <FloatingCartLink href="/calzado-urbano/carrito" />
    </div>
  );
}
