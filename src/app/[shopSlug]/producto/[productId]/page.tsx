import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BackIcon,
  ChevronIcon,
  HomeIcon,
  ShareIcon,
} from "@/components/icons";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { ShopRating } from "@/components/shop/shop-rating";
import { formatUsd } from "@/lib/formatters";
import { fetchShopDetailBySlugServer } from "@/lib/supabase/public-shop-data";

type ProductPageProps = {
  params: Promise<{ shopSlug: string; productId: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { shopSlug, productId } = await params;
  const shop = await fetchShopDetailBySlugServer(shopSlug);

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
    <div className="min-h-screen bg-[var(--color-white)] px-4 py-5 pb-28 text-[var(--color-carbon)]">
      <main className="mx-auto w-full max-w-md">
        <header className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-carbon)] text-lg font-bold text-[var(--color-white)]">
            N
          </div>
          <p className="text-lg font-bold text-[var(--color-carbon)]">{shop.vendorName}</p>
        </header>

        <section>
          <div className="relative overflow-hidden rounded-2xl bg-[var(--color-gray)]">
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
                className="mt-1.5 text-sm font-semibold text-[var(--color-carbon)]"
              />
              <p className="mt-1 text-[1.25rem] leading-none">
                {formatUsd(product.priceUsd)}
              </p>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <FavoriteToggleButton
                product={{
                  shopSlug: shop.slug,
                  shopName: shop.vendorName,
                  productId: product.id,
                  productName: product.name,
                  priceUsd: product.priceUsd,
                  imageUrl: product.imageUrl,
                  alt: product.alt,
                }}
                baseClassName="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-gray-border)]"
                activeClassName="border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-white)]"
                inactiveClassName="bg-[var(--color-gray-100)] text-[var(--color-carbon)]"
                iconClassName="h-6 w-6"
              />
              <button type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-gray-border)] bg-[var(--color-gray-100)] text-[var(--color-carbon)]"
                aria-label="Compartir producto"
              >
                <ShareIcon />
              </button>
            </div>
          </div>

          <ProductPurchasePanel shopSlug={shop.slug} productId={product.id} />
        </section>

        <section className="mt-8">
          <h2 className="text-3xl font-bold text-[var(--color-carbon)]">Descripcion</h2>
          <p className="mt-2 text-sm text-[var(--color-carbon)]">{product.description}</p>
        </section>

        <section className="mt-10 pb-4">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="text-[1.55rem] font-bold leading-none text-[var(--color-carbon)]">
              Ver mas de {shop.vendorName}
            </h3>
            <button type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-gray)]"
              aria-label="Ver mas productos"
            >
              <ChevronIcon />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((related) => (
              <article key={related.id}>
                <Link href={`/${shop.slug}/producto/${related.id}`} className="block">
                  <div className="relative overflow-hidden rounded-2xl bg-[var(--color-gray)]">
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
                  <h4 className="mt-2 text-[1.25rem] font-bold leading-none">
                    {related.name}
                  </h4>
                  <p className="mt-1 text-[1rem] font-semibold leading-none">
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

      <FloatingCartLink href="/carrito" />
    </div>
  );
}
