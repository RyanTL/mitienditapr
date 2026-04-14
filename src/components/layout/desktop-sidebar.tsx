"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CartIcon,
  FavoriteIcon,
  HomeIcon,
  OrdersIcon,
  UserIcon,
} from "@/components/icons";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { useAuthUser, getUserInitial } from "@/hooks/use-auth-user";
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
  authRequired?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: <HomeIcon className="h-5 w-5" /> },
  { href: "/favoritos", label: "Favoritos", icon: <FavoriteIcon className="h-5 w-5" />, authRequired: true },
  { href: "/ordenes", label: "Órdenes", icon: <OrdersIcon className="h-5 w-5" />, authRequired: true },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuthUser();
  const [cartCount, setCartCount] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const displayCartCount = user ? cartCount : 0;

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const visibleNavItems = isLoading
    ? NAV_ITEMS.filter((item) => !item.authRequired)
    : NAV_ITEMS.filter((item) => !item.authRequired || !!user);

  const userInitial = user ? getUserInitial(user) : null;

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-60 lg:flex-col lg:border-r lg:border-[#ede7df] lg:bg-[#faf7f3]">
      {/* Logo */}
      <div className="flex h-[72px] shrink-0 items-center border-b border-[#ede7df] px-5">
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
          {visibleNavItems.map((item) => (
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
      <div className="shrink-0 border-t border-[#ede7df] px-3 py-4 space-y-0.5">
        {user ? (
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
              {displayCartCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand)] text-[9px] font-bold text-[var(--color-white)] leading-none">
                  {displayCartCount > 9 ? "9+" : displayCartCount}
                </span>
              ) : null}
            </span>
            Carrito
          </Link>
        ) : null}

        {user ? (
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors text-[var(--color-carbon)] hover:bg-[var(--color-gray-100)]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-carbon)] text-[10px] font-bold text-[var(--color-white)]">
              {userInitial}
            </span>
            Mi cuenta
          </button>
        ) : !isLoading ? (
          <div className="space-y-1">
            <Link
              href="/sign-in"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors bg-[var(--color-brand)] text-[var(--color-white)]"
            >
              <UserIcon className="h-5 w-5 shrink-0" />
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-gray-border)] px-3 py-2.5 text-sm font-semibold transition-colors text-[var(--color-carbon)] hover:bg-[var(--color-gray-100)]"
            >
              Crear cuenta
            </Link>
          </div>
        ) : null}
      </div>

      <ProfileMenu
        user={user}
        isAuthLoading={isLoading}
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        desktopPosition="sidebar"
      />
    </aside>
  );
}
