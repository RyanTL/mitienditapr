"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/vendedor/panel", label: "Panel" },
  { href: "/vendedor/productos", label: "Productos" },
  { href: "/vendedor/pedidos", label: "Pedidos" },
  { href: "/vendedor/tienda", label: "Tienda" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function VendorTopNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 overflow-x-auto pb-1">
      <ul className="flex min-w-max items-center gap-2">
        {NAV_LINKS.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold",
                  isActive
                    ? "border-[var(--color-carbon)] bg-[var(--color-carbon)] text-[var(--color-white)]"
                    : "border-[var(--color-gray)] bg-[var(--color-white)] text-[var(--color-carbon)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/vendedor/onboarding"
            className={[
              "inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold",
              isActivePath(pathname, "/vendedor/onboarding")
                ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-white)]"
                : "border-[var(--color-gray)] bg-[var(--color-white)] text-[var(--color-carbon)]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            Onboarding
          </Link>
        </li>
      </ul>
    </nav>
  );
}
