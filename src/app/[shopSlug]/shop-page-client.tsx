"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BackIcon,
  ChevronIcon,
  CloseIcon,
  HeartIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  ShareIcon,
} from "@/components/icons";
import { FloatingCartLink } from "@/components/navigation/floating-cart-link";
import { BOTTOM_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";
import { ShopRating } from "@/components/shop/shop-rating";
import { formatUsd } from "@/lib/formatters";
import type { ShopDetail } from "@/lib/mock-shop-data";

type ShopPageClientProps = {
  shop: ShopDetail;
};

const REVIEW_CARDS = [
  {
    id: "1",
    title: "Excelente servicio",
    body: "Me llego rapido y la calidad supero mis expectativas. Volveria a comprar sin dudar.",
    author: "Andrea",
    time: "Hoy",
  },
  {
    id: "2",
    title: "Muy recomendado",
    body: "El empaque estuvo muy bien cuidado y la atencion por mensaje fue clara y amable.",
    author: "Luis",
    time: "Hace 2 dias",
  },
  {
    id: "3",
    title: "Buena compra",
    body: "Producto tal como en las fotos. Talla correcta y envio sin contratiempos.",
    author: "Camila",
    time: "Esta semana",
  },
];

const POLICY_ITEMS = [
  "Politica de reembolso",
  "Politica de envio",
  "Politica de privacidad",
  "Terminos y condiciones",
];

function getContactEmail(shopSlug: string) {
  return `hola+${shopSlug}@mitienditapr.com`;
}

export function ShopPageClient({ shop }: ShopPageClientProps) {
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const contactEmail = getContactEmail(shop.slug);
  const instagramHandle = `@${shop.slug.replaceAll("-", "")}`;
  const whatsappNumber = "+1 (939) 555-0192";
  const supportHours = "Lunes a Viernes, 9:00 AM - 5:00 PM";

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
    <div className="min-h-screen bg-[#efefef] px-4 py-4 pb-28 text-[#111]">
      <main className="mx-auto w-full max-w-md">
        <header className="mb-14 flex items-center justify-between">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d8d8d8] bg-white text-[#202020]"
            aria-label={isShopMenuOpen ? "Cerrar menu de tienda" : "Abrir menu de tienda"}
            aria-expanded={isShopMenuOpen}
            onClick={() => setIsShopMenuOpen((current) => !current)}
          >
            {isShopMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon />}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-semibold text-[#202020]"
              aria-label="Seguir vendedor"
            >
              Seguir
            </button>
            <button
              type="button"
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

      {isShopMenuOpen ? (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-black/12 px-4 py-6 backdrop-blur-[1px]"
          onClick={() => setIsShopMenuOpen(false)}
          role="presentation"
        >
          <aside
            className="mx-auto w-full max-w-md rounded-3xl border border-[#dddddd] bg-white p-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a4a4a] text-sm font-semibold text-white">
                  N
                </div>
                <div>
                  <p className="text-base font-bold text-[#1d1d1d]">{shop.vendorName}</p>
                  <ShopRating
                    rating={shop.rating}
                    reviewCount={shop.reviewCount}
                    className="text-xs font-medium text-[#4a4a4a]"
                  />
                </div>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfdfdf] text-[#313131]"
                aria-label="Cerrar menu"
                onClick={() => setIsShopMenuOpen(false)}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <section className="space-y-3" aria-label="Informacion de tienda">
              <article className="rounded-3xl bg-[#f7f7f7] p-4">
                <div className="mb-3">
                  <h3 className="text-[1.8rem] font-bold leading-none text-[#1b1b1b]">
                    Reviews
                  </h3>
                </div>

                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="text-4xl leading-none font-bold text-[#212121]">
                      {shop.rating}
                    </p>
                    <p className="mt-1 text-sm text-[#616161]">
                      {shop.reviewCount} calificaciones
                    </p>
                  </div>
                  <p className="text-2xl tracking-[0.1em] text-[#222]">★★★★★</p>
                </div>

                <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                  {REVIEW_CARDS.map((review) => (
                    <article
                      key={review.id}
                      className="min-w-[250px] snap-start rounded-2xl border border-[#ececec] bg-white p-3"
                    >
                      <h4 className="text-sm font-semibold text-[#1f1f1f]">
                        {review.title}
                      </h4>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-[#555]">
                        {review.body}
                      </p>
                      <p className="mt-2 text-xs text-[#777]">★★★★★</p>
                      <p className="mt-1 text-xs text-[#888]">
                        {review.author} · {review.time}
                      </p>
                    </article>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl bg-[#f7f7f7] p-4">
                <h3 className="text-[1.8rem] font-bold leading-none text-[#1b1b1b]">
                  Politicas
                </h3>
                <div className="mt-3 space-y-2">
                  {POLICY_ITEMS.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl px-1 py-2.5"
                    >
                      <p className="text-sm text-[#333]">{item}</p>
                      <ChevronIcon className="h-4 w-4 text-[#676767]" />
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl bg-[#f7f7f7] p-4">
                <h3 className="text-[1.8rem] font-bold leading-none text-[#1b1b1b]">
                  Contactar
                </h3>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#7b7b7b]">
                      Instagram
                    </p>
                    <p className="text-sm text-[#232323]">{instagramHandle}</p>
                  </div>
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#7b7b7b]">
                      WhatsApp
                    </p>
                    <p className="text-sm text-[#232323]">{whatsappNumber}</p>
                  </div>
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#7b7b7b]">
                      Email
                    </p>
                    <p className="text-sm text-[#232323]">{contactEmail}</p>
                  </div>
                  <div className="rounded-xl px-1 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#7b7b7b]">
                      Horario
                    </p>
                    <p className="text-sm text-[#232323]">{supportHours}</p>
                  </div>
                </div>
              </article>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl bg-[#f7f7f7] px-4 py-3 text-left text-base font-semibold text-[#1e1e1e]"
              >
                <span>Reportar tienda</span>
                <InfoIcon className="h-[18px] w-[18px] text-[#575757]" />
              </button>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
