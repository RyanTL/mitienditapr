"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HomeIcon, OrdersIcon, PackageIcon, SettingsIcon } from "@/components/icons";

const NAV_TABS = [
  { href: "/vendedor/panel", label: "Inicio", Icon: HomeIcon },
  { href: "/vendedor/pedidos", label: "Pedidos", Icon: OrdersIcon },
  { href: "/vendedor/productos", label: "Productos", Icon: PackageIcon },
  { href: "/vendedor/tienda", label: "Configuración", Icon: SettingsIcon },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function VendorBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--vendor-nav-bg)] backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--vendor-nav-border)]" />
      <ul className="flex h-[4.25rem] items-stretch">
        {NAV_TABS.map(({ href, label, Icon }) => {
          const isActive = isActivePath(pathname, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={[
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive
                    ? "text-[var(--vendor-nav-text-active)]"
                    : "text-[var(--vendor-nav-text)] active:text-[var(--vendor-nav-text-active)]",
                ].join(" ")}
              >
                <Icon className="h-[22px] w-[22px]" />
                <span className="text-[11px] font-semibold leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
