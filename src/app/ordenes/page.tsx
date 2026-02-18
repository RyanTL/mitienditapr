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

type InProgressOrder = {
  id: string;
  title: string;
  imageUrl: string;
  alt: string;
  tag?: string;
};

type PastOrder = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  alt: string;
};

const inProgressOrders: InProgressOrder[] = [
  {
    id: "p1",
    title: "Crema natural",
    imageUrl:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=640&q=80",
    alt: "Producto crema natural",
  },
  {
    id: "p2",
    title: "Equipo fitness",
    imageUrl:
      "https://images.unsplash.com/photo-1710498507624-90f2fa2499fc?auto=format&fit=crop&w=640&q=80",
    alt: "Equipo fitness",
    tag: "Ahorra $15",
  },
  {
    id: "p3",
    title: "Aceite capilar",
    imageUrl:
      "https://images.unsplash.com/photo-1598662972299-5408ddb8a3dc?auto=format&fit=crop&w=640&q=80",
    alt: "Aceite capilar",
    tag: "Gana 40%",
  },
];

const pastOrders: PastOrder[] = [
  {
    id: "o1",
    title: "Entregado 26 Ene",
    subtitle: "Kensui • 2 articulos • $113.56",
    imageUrl:
      "https://images.unsplash.com/photo-1710498507624-90f2fa2499fc?auto=format&fit=crop&w=240&q=80",
    alt: "Producto entregado",
  },
  {
    id: "o2",
    title: "Ordenado 7 Ene",
    subtitle: "Amazon",
    imageUrl:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=240&q=80",
    alt: "Caja de envio",
  },
  {
    id: "o3",
    title: "Entregado 13 Feb, 2025",
    subtitle: "Templeton Tonics • 2 articulos • $28.82",
    imageUrl:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=240&q=80",
    alt: "Producto natural",
  },
  {
    id: "o4",
    title: "Entregado 28 Sep, 2024",
    subtitle: "Noun Naturals • 1 articulo • $34.00",
    imageUrl:
      "https://images.unsplash.com/photo-1598662972299-5408ddb8a3dc?auto=format&fit=crop&w=240&q=80",
    alt: "Botella de aceite",
  },
  {
    id: "o5",
    title: "Entregado 16 Sep, 2024",
    subtitle: "Templeton Tonics • 1 articulo • $15.36",
    imageUrl:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=240&q=80",
    alt: "Producto crema",
  },
];

export default function OrdersPage() {
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
                {item.tag ? (
                  <span className="absolute top-3 left-3 rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-xs font-semibold text-[var(--color-white)]">
                    {item.tag}
                  </span>
                ) : null}
                <button type="button"
                  className="absolute right-3 bottom-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-carbon)] text-[var(--color-white)]"
                  aria-label={`Agregar ${item.title} al carrito`}
                >
                  <CartIcon />
                </button>
              </article>
            ))}
          </div>
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
                  <h3 className="truncate text-2xl font-bold leading-none text-[var(--color-carbon)]">
                    {order.title}
                  </h3>
                  <p className="mt-1 truncate text-lg leading-none text-[var(--color-carbon)]">
                    {order.subtitle}
                  </p>
                </div>
              </article>
            ))}
          </div>
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
