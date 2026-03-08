"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CartIcon,
  FavoriteIcon,
  HomeIcon,
  OrdersIcon,
} from "@/components/icons";
import {
  CART_CHANGED_EVENT,
  fetchCartQuantityTotal,
} from "@/lib/supabase/cart";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: <HomeIcon className="h-5 w-5" /> },
  { href: "/favoritos", label: "Favoritos", icon: <FavoriteIcon className="h-5 w-5" /> },
  { href: "/ordenes", label: "Ordenes", icon: <OrdersIcon className="h-5 w-5" /> },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const syncCartCount = async () => {
      try {
        const count = await fetchCartQuantityTotal();
        setCartCount(count);
      } catch {
        // ignore
      }
    };

    void syncCartCount();

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncCartCount();
    });

    window.addEventListener(CART_CHANGED_EVENT, syncCartCount);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(CART_CHANGED_EVENT, syncCartCount);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-60 lg:flex-col lg:border-r lg:border-[var(--color-gray-200)] lg:bg-[var(--color-white)]">
      {/* Logo */}
      <div className="flex h-[72px] shrink-0 items-center border-b border-[var(--color-gray-200)] px-5">
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-[var(--color-carbon)]"
        >
          Mitiendita{" "}
          <span className="text-[var(--color-brand)]">PR</span>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive(item.href)
                    ? "bg-[var(--color-carbon)] text-[var(--color-white)]"
                    : "text-[var(--color-carbon)] hover:bg-[var(--color-gray-100)]",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section — cart + account */}
      <div className="shrink-0 border-t border-[var(--color-gray-200)] px-3 py-4 space-y-0.5">
        <Link
          href="/carrito"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive("/carrito")
              ? "bg-[var(--color-carbon)] text-[var(--color-white)]"
              : "text-[var(--color-carbon)] hover:bg-[var(--color-gray-100)]",
          )}
        >
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <CartIcon className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand)] text-[9px] font-bold text-[var(--color-white)] leading-none">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </span>
          Carrito
        </Link>

        <Link
          href="/cuenta"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive("/cuenta")
              ? "bg-[var(--color-carbon)] text-[var(--color-white)]"
              : "text-[var(--color-carbon)] hover:bg-[var(--color-gray-100)]",
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-[10px] font-bold text-[var(--color-white)]">
            N
          </span>
          Mi cuenta
        </Link>
      </div>
    </aside>
  );
}
