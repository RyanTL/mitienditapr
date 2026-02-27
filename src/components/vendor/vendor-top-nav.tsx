"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [showOnboardingLink, setShowOnboardingLink] = useState(
    isActivePath(pathname, "/vendedor/onboarding"),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadVendorStatus() {
      try {
        const response = await fetch("/api/vendor/status", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (isMounted) {
            setShowOnboardingLink(false);
          }
          return;
        }

        const body = (await response.json().catch(() => null)) as
          | {
              onboarding?: {
                status?: string;
              } | null;
            }
          | null;

        if (!isMounted) {
          return;
        }

        const shouldShow = body?.onboarding?.status !== "completed";
        setShowOnboardingLink(shouldShow);
      } catch {
        if (isMounted) {
          setShowOnboardingLink(false);
        }
      }
    }

    void loadVendorStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <nav className="mb-5 overflow-x-auto pb-1 md:mb-6">
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
        {showOnboardingLink ? (
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
        ) : null}
      </ul>
    </nav>
  );
}
