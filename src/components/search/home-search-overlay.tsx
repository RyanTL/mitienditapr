"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SearchIcon } from "@/components/icons";
import type { MarketplaceSearchShop } from "@/lib/supabase/public-shop-data-browser";

type HomeSearchOverlayProps = {
  isOpen: boolean;
  shops: MarketplaceSearchShop[];
  onClose: () => void;
};

type SearchProduct = {
  id: string;
  name: string;
  imageUrl: string;
  alt: string;
  shopSlug: string;
  shopName: string;
};

const FALLBACK_IMAGE_URL =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=80";

function toSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function includesSearchText(value: string, searchText: string) {
  return toSearchText(value).includes(searchText);
}

export function HomeSearchOverlay({
  isOpen,
  shops,
  onClose,
}: HomeSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const focusTimer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 16);

      return () => window.clearTimeout(focusTimer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const searchText = toSearchText(query);
  const allProducts = useMemo<SearchProduct[]>(
    () =>
      shops.flatMap((shop) =>
        shop.products.map((product) => ({
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl || FALLBACK_IMAGE_URL,
          alt: product.alt,
          shopSlug: shop.slug,
          shopName: shop.name,
        })),
      ),
    [shops],
  );

  const matchingShops = useMemo(() => {
    if (!searchText) {
      return shops.slice(0, 8);
    }

    return shops.filter(
      (shop) =>
        includesSearchText(shop.name, searchText) ||
        includesSearchText(shop.slug, searchText),
    );
  }, [searchText, shops]);

  const matchingProducts = useMemo(() => {
    if (!searchText) {
      return [];
    }

    return allProducts.filter(
      (product) =>
        includesSearchText(product.name, searchText) ||
        includesSearchText(product.shopName, searchText),
    );
  }, [allProducts, searchText]);

  return (
    <div
      className={[
        "fixed inset-0 z-50 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-015)] backdrop-blur-[1px]"
        onClick={handleClose}
        aria-label="Cerrar busqueda"
      />

      <section
        className={[
          "absolute top-4 right-3 left-3 mx-auto w-full max-w-md origin-top-right rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] shadow-[0_18px_44px_var(--shadow-black-018)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.96] opacity-0",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-label="Buscar tiendas y productos"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 rounded-t-3xl bg-[var(--color-white)] p-3">
          <label className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-[var(--color-gray-500)]">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar tiendas o productos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] py-2 pr-3 pl-10 text-sm text-[var(--color-carbon)] outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-3 pb-3">
          <div className="mb-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-gray-500)]">
              {searchText ? "Resultados" : "Tiendas"}
            </p>
          </div>

          {matchingShops.length === 0 && matchingProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-6 text-center">
              <p className="text-sm font-medium text-[var(--color-carbon)]">
                No encontramos resultados.
              </p>
              <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                Intenta con otro termino.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchingShops.length > 0 ? (
                <section className="space-y-2">
                  {matchingShops.map((shop) => (
                    <Link
                      key={`shop:${shop.id}`}
                      href={`/${shop.slug}`}
                      onClick={handleClose}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 transition-colors hover:bg-[var(--color-gray-100)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-carbon)] text-sm font-semibold text-[var(--color-white)]">
                        {shop.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-carbon)]">
                          {shop.name}
                        </p>
                        <p className="text-xs text-[var(--color-gray-500)]">
                          {shop.rating} ★ ({shop.reviewCount})
                        </p>
                      </div>
                    </Link>
                  ))}
                </section>
              ) : null}

              {matchingProducts.length > 0 ? (
                <section className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-gray-500)]">
                    Productos
                  </p>
                  {matchingProducts.map((product) => (
                    <Link
                      key={`product:${product.shopSlug}:${product.id}`}
                      href={`/${product.shopSlug}/producto/${product.id}`}
                      onClick={handleClose}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 transition-colors hover:bg-[var(--color-gray-100)]"
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-[var(--color-gray-100)]">
                        <Image
                          src={product.imageUrl}
                          alt={product.alt}
                          fill
                          unoptimized
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-carbon)]">
                          {product.name}
                        </p>
                        <p className="text-xs text-[var(--color-gray-500)]">
                          {product.shopName}
                        </p>
                      </div>
                    </Link>
                  ))}
                </section>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
