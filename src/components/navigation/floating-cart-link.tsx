"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CartIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CART_CHANGED_EVENT,
  fetchCartQuantityTotal,
} from "@/lib/supabase/cart";

import { FLOATING_CART_BUTTON_CLASS } from "./nav-styles";

type FloatingCartLinkProps = {
  href: string;
  count?: number;
  fixed?: boolean;
  className?: string;
};

export function FloatingCartLink({
  href,
  count,
  fixed = true,
  className,
}: FloatingCartLinkProps) {
  const [dynamicCount, setDynamicCount] = useState(0);

  useEffect(() => {
    if (typeof count === "number") {
      return;
    }

    const syncCartCount = async () => {
      try {
        const nextCount = await fetchCartQuantityTotal();
        setDynamicCount(nextCount);
      } catch (error) {
        console.error("No se pudo cargar el contador del carrito:", error);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void syncCartCount();
    }, 0);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncCartCount();
    });

    window.addEventListener(CART_CHANGED_EVENT, syncCartCount);

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
      window.removeEventListener(CART_CHANGED_EVENT, syncCartCount);
    };
  }, [count]);

  const resolvedCount = typeof count === "number" ? count : dynamicCount;
  const placementClass = fixed ? "fixed right-4 bottom-6 z-20" : "relative";
  const mergedClassName = [placementClass, FLOATING_CART_BUTTON_CLASS, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={mergedClassName} aria-label="Abrir carrito">
      <CartIcon />
      {resolvedCount > 0 ? (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-[var(--color-white)] px-1.5 text-[10px] font-bold leading-4 text-[var(--color-brand)]">
          {resolvedCount}
        </span>
      ) : null}
    </Link>
  );
}
