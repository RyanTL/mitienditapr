import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BackIcon,
  ChevronDownIcon,
  ChevronIcon,
  HeartIcon,
  HomeIcon,
  ShareIcon,
} from "@/components/icons";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { ShopRating } from "@/components/shop/shop-rating";
import { formatUsd } from "@/lib/formatters";
import { getShopBySlug } from "@/lib/mock-shop-data";

type ProductPageProps = {
  params: Promise<{ shopSlug: string; productId: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { shopSlug, productId } = await params;
  const shop = getShopBySlug(shopSlug);

  if (!shop) {
    notFound();
  }

  const product = shop.products.find((entry) => entry.id === productId);
  if (!product) {
    notFound();
  }

  const relatedProducts = shop.products
    .filter((entry) => entry.id !== product.id)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-5 pb-28 text-[#111]">
      <main className="mx-auto w-full max-w-md">
        <header className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4b4b4b] text-lg font-bold text-white">
            N
          </div>
          <p className="text-lg font-bold text-[#171717]">{shop.vendorName}</p>
        </header>

        <section>
          <div className="relative overflow-hidden rounded-2xl bg-[#dfdfdf]">
            <div className="relative h-[360px]">
              <Image
                src={product.imageUrl}
                alt={product.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 460px"
                priority
              />
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between">
            <div>
              <h1 className="text-[1.75rem] font-medium leading-none">{product.name}</h1>
              <ShopRating
                rating={shop.rating}
                reviewCount={shop.reviewCount}
                className="mt-1.5 text-sm font-semibold text-[#222]"
              />
              <p className="mt-1 text-[1.25rem] leading-none">
                {formatUsd(product.priceUsd)}
              </p>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <button type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#cdcdcd] bg-[#efefef] text-[#1b1b1b]"
                aria-label="Guardar producto"
              >
                <HeartIcon />
              </button>
              <button type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#cdcdcd] bg-[#efefef] text-[#1b1b1b]"
                aria-label="Compartir producto"
              >
                <ShareIcon />
              </button>
            </div>
          </div>

          <button type="button" className="mt-5 inline-flex items-center gap-1.5 text-sm text-[#3a3a3a]">
            Ship to 00667
            <span className="inline-flex items-center justify-center">
              <ChevronDownIcon />
            </span>
          </button>

          <div className="mt-6">
            <p className="text-sm text-[#3a3a3a]">Cantidad</p>
            <div className="mt-1 inline-flex items-center gap-4 rounded-full border border-[#d6d6d6] px-3 py-1 text-lg leading-none text-[#2b2b2b]">
              <button type="button" aria-label="Restar cantidad">−</button>
              <span>1</span>
              <button type="button" aria-label="Sumar cantidad">+</button>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button type="button" className="w-full rounded-3xl bg-[#28737f] px-6 py-3.5 text-3xl font-bold text-white">
              Anadir al carrito
            </button>
            <button type="button" className="w-full rounded-3xl bg-black px-6 py-3.5 text-3xl font-bold text-white">
              Comprar ahora
            </button>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-3xl font-bold text-[#171717]">Descripcion</h2>
          <p className="mt-2 text-sm text-[#4a4a4a]">{product.description}</p>
        </section>

        <section className="mt-10 pb-4">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-[1.55rem] font-bold leading-none text-[#161616]">
              Ver mas de {shop.vendorName}
            </h3>
            <button type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cbcbcb]"
              aria-label="Ver mas productos"
            >
              <ChevronIcon />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((related) => (
              <article key={related.id}>
                <Link href={`/${shop.slug}/producto/${related.id}`} className="block">
                  <div className="relative overflow-hidden rounded-2xl bg-[#dedede]">
                    <div className="relative h-[180px]">
                      <Image
                        src={related.imageUrl}
                        alt={related.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 48vw, 220px"
                      />
                    </div>
                  </div>
                  <h4 className="mt-2 text-[1.65rem] font-bold leading-none">
                    {related.name}
                  </h4>
                  <p className="mt-1 text-[1.7rem] font-semibold leading-none">
                    {formatUsd(related.priceUsd)}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <TwoItemBottomNav
        containerClassName={FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS}
        firstItem={{
          ariaLabel: "Volver a la tienda",
          icon: <BackIcon />,
          href: `/${shop.slug}`,
        }}
        secondItem={{
          ariaLabel: "Ir a inicio",
          icon: <HomeIcon />,
          href: "/",
        }}
      />
    </div>
  );
}
