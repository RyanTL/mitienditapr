"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BackIcon,
  ChevronIcon,
  CloseIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  ShareIcon,
} from "@/components/icons";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { BOTTOM_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { FollowShopButton } from "@/components/shop/follow-shop-button";
import { ShopRating } from "@/components/shop/shop-rating";
import { formatUsd } from "@/lib/formatters";
import { fetchShopReviews } from "@/lib/reviews/client";
import type { ShopReviewsResponse } from "@/lib/reviews/types";
import type { ShopDetail } from "@/lib/mock-shop-data";

type ShopPageClientProps = {
  shop: ShopDetail;
};

const POLICY_ITEMS = [
  "Politica de reembolso",
  "Politica de envio",
  "Politica de privacidad",
  "Terminos y condiciones",
];

function getContactEmail(shopSlug: string) {
  return `hola+${shopSlug}@mitienditapr.com`;
}

function renderStars(rating: number) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(clamped)}${"☆".repeat(5 - clamped)}`;
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("es-PR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ShopPageClient({ shop }: ShopPageClientProps) {
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [shopReviewsData, setShopReviewsData] = useState<ShopReviewsResponse | null>(
    null,
  );
  const [isLoadingShopReviews, setIsLoadingShopReviews] = useState(false);
  const [shopReviewsError, setShopReviewsError] = useState<string | null>(null);
  const contactEmail = getContactEmail(shop.slug);
  const instagramHandle = `@${shop.slug.replaceAll("-", "")}`;
  const whatsappNumber = "+1 (939) 555-0192";
  const supportHours = "Lunes a Viernes, 9:00 AM - 5:00 PM";

  useEffect(() => {
    if (!isShopMenuOpen) {
      return;
    }

    let isMounted = true;

    async function loadShopReviews() {
      setIsLoadingShopReviews(true);
      setShopReviewsError(null);

      try {
        const response = await fetchShopReviews(shop.slug, 8);
        if (!isMounted) {
          return;
        }
        setShopReviewsData(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setShopReviewsError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las reviews de la tienda.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingShopReviews(false);
        }
      }
    }

    void loadShopReviews();

    return () => {
      isMounted = false;
    };
  }, [isShopMenuOpen, shop.slug]);

  const shopReviewSummary = shopReviewsData?.summary ?? {
    averageRating: shop.rating,
    reviewCount: shop.reviewCount,
  };

  useEffect(() => {
    if (!isShopMenuOpen) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, [isShopMenuOpen]);

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-4 pb-28 text-[var(--color-carbon)]">
      <main className="mx-auto w-full max-w-md">
        <header className="mb-14 flex items-center justify-between">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] text-[var(--color-carbon)]"
            aria-label={isShopMenuOpen ? "Cerrar menu de tienda" : "Abrir menu de tienda"}
            aria-expanded={isShopMenuOpen}
            onClick={() => setIsShopMenuOpen((current) => !current)}
          >
            {isShopMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon />}
          </button>
          <div className="flex items-center gap-2">
            <FollowShopButton shopSlug={shop.slug} />
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] text-[var(--color-carbon)]"
              aria-label="Compartir tienda"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mb-20 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">{shop.vendorName}</h1>
          <p className="mx-auto mt-6 max-w-[32ch] text-lg leading-6 text-[var(--color-carbon)]">
            {shop.description}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-x-3 gap-y-6 pb-6">
          {shop.products.map((product) => (
            <article key={product.id}>
              <div className="relative mb-2">
                <Link
                  href={`/${shop.slug}/producto/${product.id}`}
                  className="block overflow-hidden rounded-3xl bg-[var(--color-gray)]"
                >
                  <div className="relative h-[190px]">
                    <Image
                      src={product.imageUrl}
                      alt={product.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 48vw, 240px"
                    />
                  </div>
                </Link>

                <div className="absolute right-2 bottom-2">
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
                    baseClassName="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-white)] backdrop-blur-sm"
                    activeClassName="bg-[var(--color-brand)]"
                    inactiveClassName="bg-[var(--color-gray-500)]"
                    iconClassName="h-5 w-5"
                  />
                </div>
              </div>

              <Link href={`/${shop.slug}/producto/${product.id}`} className="block">
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

      {isShopMenuOpen ? (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-[var(--overlay-black-012)] px-4 py-6 backdrop-blur-[1px]"
          onClick={() => setIsShopMenuOpen(false)}
          role="presentation"
        >
          <aside
            className="mx-auto w-full max-w-md rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4 shadow-[0_18px_40px_var(--shadow-black-012)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)]">
                  N
                </div>
                <div>
                  <p className="text-base font-bold text-[var(--color-carbon)]">{shop.vendorName}</p>
                  <ShopRating
                    rating={shopReviewSummary.averageRating}
                    reviewCount={shopReviewSummary.reviewCount}
                    className="text-xs font-medium text-[var(--color-carbon)]"
                  />
                </div>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
                aria-label="Cerrar menu"
                onClick={() => setIsShopMenuOpen(false)}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <section className="space-y-3" aria-label="Informacion de tienda">
              <article className="rounded-3xl bg-[var(--color-gray)] p-4">
                <div className="mb-3">
                  <h3 className="text-[1.8rem] font-bold leading-none text-[var(--color-carbon)]">
                    Reviews
                  </h3>
                </div>

                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="text-4xl leading-none font-bold text-[var(--color-carbon)]">
                      {shopReviewSummary.averageRating}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-carbon)]">
                      {shopReviewSummary.reviewCount} calificaciones
                    </p>
                  </div>
                  <p className="text-2xl tracking-[0.1em] text-[var(--color-carbon)]">
                    {renderStars(Number(shopReviewSummary.averageRating))}
                  </p>
                </div>

                {isLoadingShopReviews ? (
                  <p className="text-sm text-[var(--color-carbon)]">Cargando reviews...</p>
                ) : shopReviewsError ? (
                  <p className="text-sm text-[var(--color-danger)]">{shopReviewsError}</p>
                ) : !shopReviewsData || shopReviewsData.reviews.length === 0 ? (
                  <p className="text-sm text-[var(--color-carbon)]">
                    Aun no hay reviews en esta tienda.
                  </p>
                ) : (
                  <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                    {shopReviewsData.reviews.map((review) => (
                      <article
                        key={review.id}
                        className="min-w-[250px] snap-start rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3"
                      >
                        <h4 className="text-sm font-semibold text-[var(--color-carbon)]">
                          {review.productName}
                        </h4>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--color-carbon)]">
                          {review.comment ?? "Sin comentario."}
                        </p>
                        <p className="mt-2 text-xs text-[var(--color-brand)]">
                          {renderStars(review.rating)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-carbon)]">
                          {review.reviewerDisplayName} · {formatReviewDate(review.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-3xl bg-[var(--color-gray)] p-4">
                <h3 className="text-[1.8rem] font-bold leading-none text-[var(--color-carbon)]">
                  Politicas
                </h3>
                <div className="mt-3 space-y-2">
                  {POLICY_ITEMS.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl px-1 py-2.5"
                    >
                      <p className="text-sm text-[var(--color-carbon)]">{item}</p>
                      <ChevronIcon className="h-4 w-4 text-[var(--color-carbon)]" />
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl bg-[var(--color-gray)] p-4">
                <h3 className="text-[1.8rem] font-bold leading-none text-[var(--color-carbon)]">
                  Contactar
                </h3>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-carbon)]">
                      Instagram
                    </p>
                    <p className="text-sm text-[var(--color-carbon)]">{instagramHandle}</p>
                  </div>
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-carbon)]">
                      WhatsApp
                    </p>
                    <p className="text-sm text-[var(--color-carbon)]">{whatsappNumber}</p>
                  </div>
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-carbon)]">
                      Email
                    </p>
                    <p className="text-sm text-[var(--color-carbon)]">{contactEmail}</p>
                  </div>
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-carbon)]">
                      Horario
                    </p>
                    <p className="text-sm text-[var(--color-carbon)]">{supportHours}</p>
                  </div>
                </div>
              </article>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-gray)] px-4 py-3 text-left text-base font-semibold text-[var(--color-carbon)]"
              >
                <span>Reportar tienda</span>
                <InfoIcon className="h-[18px] w-[18px] text-[var(--color-carbon)]" />
              </button>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
