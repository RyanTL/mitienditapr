"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  AthMovilIcon,
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
import { ShopContactChips, ShopContactExtraChips } from "@/components/shop/shop-contact-chips";
import { ShopRating } from "@/components/shop/shop-rating";
import { VendorShopAvatar } from "@/components/shop/vendor-shop-avatar";
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";
import {
  formatDateEsPr,
  formatUsd,
  renderStars,
} from "@/lib/formatters";
import { POLICY_TYPE_LABELS } from "@/lib/policies/constants";
import { fetchPublicShopPolicies } from "@/lib/policies/client";
import type { PolicyType, PublicShopPoliciesResponse } from "@/lib/policies/types";
import { fetchShopReviews } from "@/lib/reviews/client";
import type { ShopReviewsResponse } from "@/lib/reviews/types";
import type { ShopDetail } from "@/lib/supabase/shop-types";
import { fetchVendorStatus } from "@/lib/vendor/client";

const ShopSharePopup = dynamic(
  () =>
    import("@/components/share/shop-share-popup").then(
      (mod) => mod.ShopSharePopup,
    ),
  { ssr: false },
);

type ShopPageClientProps = {
  shop: ShopDetail;
};

const REPORT_REASON_OPTIONS = [
  "Información engañosa",
  "Problema con políticas",
  "Producto sospechoso",
  "Otro",
];

function getContactEmail(shopSlug: string) {
  return `hola+${shopSlug}@mitienditapr.com`;
}

export function ShopPageClient({ shop }: ShopPageClientProps) {
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [isOwnerViewingShop, setIsOwnerViewingShop] = useState(false);
  const [shopReviewsData, setShopReviewsData] = useState<ShopReviewsResponse | null>(
    null,
  );
  const [isLoadingShopReviews, setIsLoadingShopReviews] = useState(false);
  const [shopReviewsError, setShopReviewsError] = useState<string | null>(null);
  const [shopPoliciesData, setShopPoliciesData] = useState<PublicShopPoliciesResponse | null>(
    null,
  );
  const [isLoadingShopPolicies, setIsLoadingShopPolicies] = useState(false);
  const [shopPoliciesError, setShopPoliciesError] = useState<string | null>(null);
  const [isPoliciesExpanded, setIsPoliciesExpanded] = useState(false);
  const [activePolicyType, setActivePolicyType] = useState<PolicyType | null>(null);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASON_OPTIONS[0]);
  const [reportPolicyType, setReportPolicyType] = useState<PolicyType | "">("");
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const contactEmail = getContactEmail(shop.slug);
  const closeShopMenu = useCallback(() => {
    setIsShopMenuOpen(false);
    setIsPoliciesExpanded(false);
  }, []);

  useBodyScrollLock(Boolean(isShopMenuOpen || activePolicyType || isReportMenuOpen));
  useEscapeKey(Boolean(isShopMenuOpen || activePolicyType || isReportMenuOpen), () => {
    closeShopMenu();
    setActivePolicyType(null);
    setIsReportMenuOpen(false);
  });

  useEffect(() => {
    let isMounted = true;

    async function resolveOwnerMode() {
      try {
        const body = await fetchVendorStatus();
        if (!isMounted) {
          return;
        }

        setIsOwnerViewingShop(body?.shop?.slug === shop.slug);
      } catch {
        if (isMounted) {
          setIsOwnerViewingShop(false);
        }
      }
    }

    void resolveOwnerMode();

    return () => {
      isMounted = false;
    };
  }, [shop.slug]);

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

    async function loadShopPolicies() {
      setIsLoadingShopPolicies(true);
      setShopPoliciesError(null);

      try {
        const response = await fetchPublicShopPolicies(shop.slug);
        if (!isMounted) {
          return;
        }
        setShopPoliciesData(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setShopPoliciesError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las políticas de la tienda.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingShopPolicies(false);
        }
      }
    }

    void loadShopPolicies();

    return () => {
      isMounted = false;
    };
  }, [isShopMenuOpen, shop.slug]);

  const shopReviewSummary = shopReviewsData?.summary ?? {
    averageRating: shop.rating,
    reviewCount: shop.reviewCount,
  };
  const availablePolicyTypes = (Object.keys(shopPoliciesData?.policies ?? {}) as PolicyType[])
    .filter((policyType) => Boolean(shopPoliciesData?.policies[policyType]?.id));
  const activePolicy = activePolicyType
    ? shopPoliciesData?.policies[activePolicyType] ?? null
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-4 pb-28 lg:pb-8 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl">
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
              onClick={() => setIsSharePopupOpen(true)}
            >
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mb-20 text-center md:mb-14">
          <h1 className="text-5xl font-extrabold tracking-tight">{shop.vendorName}</h1>
          {shop.description.trim().length > 0 ? (
            <p className="mx-auto mt-6 max-w-[32ch] text-lg leading-6 text-[var(--color-carbon)]">
              {shop.description}
            </p>
          ) : null}
          {(shop.athMovilPhone || shop.acceptsStripePayments) ? (
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-2 text-sm font-semibold text-[var(--color-carbon)] shadow-[0_4px_12px_var(--shadow-black-008)]">
                {shop.athMovilPhone ? <AthMovilIcon className="h-4 w-4" /> : null}
                {shop.athMovilPhone && shop.acceptsStripePayments
                  ? "Se acepta ATH Móvil y tarjetas"
                  : shop.athMovilPhone
                    ? "Se acepta ATH Móvil"
                    : "Se aceptan pagos con tarjetas"}
              </span>
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-x-3 gap-y-6 pb-6 md:grid-cols-3 lg:grid-cols-4">
          {shop.products.map((product, index) => (
            <article key={product.id}>
              <div className="relative mb-2">
                <Link
                  href={`/${shop.slug}/producto/${product.id}`}
                  className="block overflow-hidden rounded-3xl bg-[var(--color-gray)]"
                >
                  <div className="relative h-[190px] md:h-[200px]">
                    <Image
                      src={product.imageUrl}
                      alt={product.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 48vw, 240px"
                      priority={index < 2}
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
                <p className="mt-1 text-l font-semibold leading-tight">
                  {formatUsd(product.priceUsd)}
                </p>
              </Link>
            </article>
          ))}
        </section>
      </main>

      <div className="fixed right-4 bottom-6 left-4 z-20 flex items-center justify-between md:right-6 md:bottom-8 md:left-6 lg:hidden">
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
          onClick={closeShopMenu}
          role="presentation"
        >
          <aside
            className="mx-auto w-full max-w-md rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] p-4 shadow-[0_18px_40px_var(--shadow-black-012)] md:max-w-2xl lg:max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VendorShopAvatar
                  vendorName={shop.vendorName}
                  logoUrl={shop.logoUrl}
                  sizePx={40}
                  textClassName="text-sm font-semibold"
                />
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
                onClick={closeShopMenu}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <section className="space-y-3" aria-label="Información de tienda">
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
                    Aún no hay reviews en esta tienda.
                  </p>
                ) : (
                  <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                    {shopReviewsData.reviews.map((review) => (
                      <article
                        key={review.id}
                        className="min-w-[250px] snap-start rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3 md:min-w-[300px]"
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
                          {review.reviewerDisplayName} · {formatDateEsPr(review.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-3xl bg-[var(--color-gray)] p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setIsPoliciesExpanded((current) => !current)}
                  aria-expanded={isPoliciesExpanded}
                  aria-label="Mostrar políticas"
                >
                  <h3 className="text-[1.8rem] font-bold leading-none text-[var(--color-carbon)]">
                    Políticas
                  </h3>
                  <ChevronIcon
                    className={[
                      "h-5 w-5 text-[var(--color-carbon)] transition-transform duration-200",
                      isPoliciesExpanded ? "rotate-90" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </button>

                {isPoliciesExpanded ? (
                  <div className="mt-3 space-y-1.5">
                    {isLoadingShopPolicies ? (
                      <p className="text-sm text-[var(--color-carbon)]">Cargando políticas...</p>
                    ) : shopPoliciesError ? (
                      <p className="text-sm text-[var(--color-danger)]">{shopPoliciesError}</p>
                    ) : availablePolicyTypes.length === 0 ? (
                      <p className="text-sm text-[var(--color-carbon)]">
                        La tienda aún no ha publicado políticas.
                      </p>
                    ) : (
                      availablePolicyTypes.map((policyType) => (
                        <button
                          key={policyType}
                          type="button"
                          onClick={() => setActivePolicyType(policyType)}
                          className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-left"
                        >
                          <p className="text-base leading-none text-[var(--color-carbon)]">
                            {POLICY_TYPE_LABELS[policyType]}
                          </p>
                          <ChevronIcon className="h-4 w-4 text-[var(--color-carbon)]" />
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </article>

              <article className="rounded-3xl bg-[var(--color-gray)] p-4">
                <h3 className="text-[1.8rem] font-bold leading-none text-[var(--color-carbon)]">
                  Contactos
                </h3>
                <div className="mt-3 space-y-2">
                  <ShopContactChips
                    contact={{
                      phone: shop.contactPhone,
                      whatsapp: shop.contactWhatsapp,
                      instagram: shop.contactInstagram,
                      facebook: shop.contactFacebook,
                    }}
                  />
                  <ShopContactExtraChips
                    platformEmail={contactEmail}
                    athMovilPhone={shop.athMovilPhone}
                  />
                </div>
              </article>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-gray)] px-4 py-3 text-left text-base font-semibold text-[var(--color-carbon)]"
                onClick={() => {
                  setIsReportMenuOpen(true);
                  setReportFeedback(null);
                }}
              >
                <span>Reportar tienda</span>
                <InfoIcon className="h-[18px] w-[18px] text-[var(--color-carbon)]" />
              </button>
            </section>
          </aside>
        </div>
      ) : null}

      {activePolicyType ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay-black-055)]"
            onClick={() => setActivePolicyType(null)}
            aria-label="Cerrar política"
          />
          <section className="absolute inset-x-4 top-1/2 mx-auto max-w-3xl -translate-y-1/2 rounded-3xl bg-[var(--color-white)] p-5 shadow-[0_30px_80px_var(--shadow-black-035)] md:max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--color-carbon)]">
                {POLICY_TYPE_LABELS[activePolicyType]}
              </h3>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
                onClick={() => setActivePolicyType(null)}
                aria-label="Cerrar política"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray)] p-3">
              <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-carbon)]">
                {activePolicy?.body ?? "No disponible."}
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {isReportMenuOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay-black-055)]"
            onClick={() => setIsReportMenuOpen(false)}
            aria-label="Cerrar reporte"
          />
          <section className="absolute inset-x-4 top-1/2 mx-auto max-w-3xl -translate-y-1/2 rounded-3xl bg-[var(--color-white)] p-5 shadow-[0_30px_80px_var(--shadow-black-035)] md:max-w-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--color-carbon)]">Reportar tienda</h3>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
                onClick={() => setIsReportMenuOpen(false)}
                aria-label="Cerrar reporte"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                Categoría
              </span>
              <div className="relative mt-1">
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] py-2 pr-10 pl-3 text-sm"
                >
                  {REPORT_REASON_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-gray-500)]" />
              </div>
            </label>

            {reportReason === "Problema con políticas" ? (
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-[var(--color-gray-500)]">
                  Política relacionada
                </span>
                <div className="relative mt-1">
                  <select
                    value={reportPolicyType}
                    onChange={(event) => setReportPolicyType(event.target.value as PolicyType | "")}
                    className="w-full appearance-none rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] py-2 pr-10 pl-3 text-sm"
                  >
                    <option value="">Selecciona una política</option>
                    {availablePolicyTypes.map((policyType) => (
                      <option key={policyType} value={policyType}>
                        {POLICY_TYPE_LABELS[policyType]}
                      </option>
                    ))}
                  </select>
                  <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-gray-500)]" />
                </div>
              </label>
            ) : null}

            {reportFeedback ? (
              <p className="mt-3 rounded-xl bg-[var(--color-gray)] px-3 py-2 text-xs text-[var(--color-carbon)]">
                {reportFeedback}
              </p>
            ) : null}

            <button
              type="button"
              className="mt-4 w-full rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
              onClick={() => {
                setReportFeedback(
                  reportReason === "Problema con políticas" && reportPolicyType
                    ? `Reporte enviado: ${reportReason} (${POLICY_TYPE_LABELS[reportPolicyType]}).`
                    : `Reporte enviado: ${reportReason}.`,
                );
              }}
            >
              Enviar reporte
            </button>
          </section>
        </div>
      ) : null}

      {isSharePopupOpen ? (
        <ShopSharePopup
          isOpen={isSharePopupOpen}
          onClose={() => setIsSharePopupOpen(false)}
          shopSlug={shop.slug}
          ownerMode={isOwnerViewingShop}
        />
      ) : null}
    </div>
  );
}
