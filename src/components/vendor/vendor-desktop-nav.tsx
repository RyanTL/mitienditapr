"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ExternalLinkIcon } from "@/components/icons";
import { fetchVendorStatus } from "@/lib/vendor/client";

const NAV_LINKS = [
  { href: "/vendedor/panel", label: "Inicio" },
  { href: "/vendedor/pedidos", label: "Pedidos" },
  { href: "/vendedor/productos", label: "Productos" },
  { href: "/vendedor/tienda", label: "Configuración" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function VendorDesktopNav() {
  const pathname = usePathname();
  const [shopHref, setShopHref] = useState("/");

  useEffect(() => {
    let cancelled = false;

    void fetchVendorStatus()
      .then((status) => {
        if (cancelled) return;
        setShopHref(status.shop?.slug ? `/${status.shop.slug}` : "/");
      })
      .catch(() => {
        if (cancelled) return;
        setShopHref("/");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="sticky top-0 z-40 hidden border-b border-[var(--vendor-nav-border)] bg-[var(--vendor-nav-bg)]/95 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-6xl items-center px-6">
        <Link
          href="/"
          className="mr-6 text-sm font-bold text-[var(--color-carbon)] transition-opacity hover:opacity-70"
        >
          Mitiendita
        </Link>

        <div className="flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative px-3 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "text-[var(--vendor-nav-text-active)]"
                    : "text-[var(--vendor-nav-text)] hover:text-[var(--vendor-nav-text-active)]",
                ].join(" ")}
              >
                {label}
                {isActive && (
                  <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--vendor-nav-accent)]" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto">
          <Link
            href={shopHref}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--vendor-nav-accent)] transition-opacity hover:opacity-80"
          >
            Ver tienda
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
