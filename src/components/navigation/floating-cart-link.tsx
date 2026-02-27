"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CartIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CART_CHANGED_EVENT,
  fetchPrimaryCartShopSlug,
  fetchCartQuantityTotal,
} from "@/lib/supabase/cart";

import { FLOATING_CART_BUTTON_CLASS } from "./nav-styles";

type FloatingCartLinkProps = {
  href: string;
  resolveFromCart?: boolean;
  count?: number;
  fixed?: boolean;
  className?: string;
};

export function FloatingCartLink({
  href,
  resolveFromCart = false,
  count,
  fixed = true,
  className,
}: FloatingCartLinkProps) {
  const [dynamicCount, setDynamicCount] = useState(0);
  const [dynamicHref, setDynamicHref] = useState<string | null>(null);

  useEffect(() => {
    if (typeof count === "number" && !resolveFromCart) {
      return;
    }

    const syncCartState = async () => {
      try {
        const [nextCount, primaryShopSlug] = await Promise.all([
          typeof count === "number" ? Promise.resolve(count) : fetchCartQuantityTotal(),
          resolveFromCart ? fetchPrimaryCartShopSlug() : Promise.resolve(null),
        ]);

        if (typeof count !== "number") {
          setDynamicCount(nextCount);
        }

        if (resolveFromCart) {
          setDynamicHref(primaryShopSlug ? `/${primaryShopSlug}/carrito` : href);
        }
      } catch (error) {
        console.error("No se pudo cargar el contador del carrito:", error);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void syncCartState();
    }, 0);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncCartState();
    });

    window.addEventListener(CART_CHANGED_EVENT, syncCartState);

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
      window.removeEventListener(CART_CHANGED_EVENT, syncCartState);
    };
  }, [count, href, resolveFromCart]);

  const resolvedCount = typeof count === "number" ? count : dynamicCount;
  const resolvedHref = resolveFromCart ? (dynamicHref ?? href) : href;
  const placementClass = fixed ? "fixed right-4 bottom-6 z-20 md:right-6 md:bottom-8" : "relative";
  const mergedClassName = [placementClass, FLOATING_CART_BUTTON_CLASS, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={resolvedHref} className={mergedClassName} aria-label="Abrir carrito">
      <CartIcon />
      {resolvedCount > 0 ? (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-[var(--color-white)] px-1.5 text-[10px] font-bold leading-4 text-[var(--color-brand)]">
          {resolvedCount}
        </span>
      ) : null}
    </Link>
  );
}
