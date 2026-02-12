import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BackIcon,
  HeartIcon,
  HomeIcon,
  MenuIcon,
  ShareIcon,
} from "@/components/icons";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { BOTTOM_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { formatUsd } from "@/lib/formatters";
import { getShopBySlug } from "@/lib/mock-shop-data";

type ShopPageProps = {
  params: Promise<{ shopSlug: string }>;
};

export default async function ShopPage({ params }: ShopPageProps) {
  const { shopSlug } = await params;
  const shop = getShopBySlug(shopSlug);

  if (!shop) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-4 pb-28 text-[#111]">
      <main className="mx-auto w-full max-w-md">
        <header className="mb-14 flex items-center justify-between">
          <button type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d8d8d8] bg-white text-[#202020]"
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2">
            <button type="button"
              className="rounded-full border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-semibold text-[#202020]"
              aria-label="Seguir vendedor"
            >
              Seguir
            </button>
            <button type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d8d8d8] bg-white text-[#202020]"
              aria-label="Compartir tienda"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mb-20 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">{shop.vendorName}</h1>
          <p className="mx-auto mt-6 max-w-[32ch] text-lg leading-6 text-[#2d2d2d]">
            {shop.description}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-x-3 gap-y-6 pb-6">
          {shop.products.map((product) => (
            <article key={product.id}>
              <Link href={`/${shop.slug}/producto/${product.id}`} className="block">
                <div className="relative mb-2 overflow-hidden rounded-3xl bg-[#dedede]">
                  <div className="relative h-[190px]">
                    <Image
                      src={product.imageUrl}
                      alt={product.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 48vw, 240px"
                    />
                  </div>
                  <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#a4a4a4]/85 text-white backdrop-blur-sm">
                    <HeartIcon className="h-5 w-5" />
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-tight">
                  {product.name}
                </h2>
                <p className="mt-1 text-xl font-semibold leading-tight">
                  {formatUsd(product.priceUsd)}
                </p>
              </Link>
            </article>
          ))}
        </section>
      </main>

      <div className="fixed right-4 bottom-6 left-4 z-20 flex items-center justify-between">
        <TwoItemBottomNav
          containerClassName={BOTTOM_NAV_CONTAINER_CLASS}
          firstItem={{
            ariaLabel: "Volver",
            icon: <BackIcon />,
            href: "/",
          }}
          secondItem={{
            ariaLabel: "Inicio",
            icon: <HomeIcon />,
            href: "/",
          }}
        />
        <FloatingCartLink href={`/${shop.slug}/carrito`} fixed={false} />
      </div>
    </div>
  );
}
