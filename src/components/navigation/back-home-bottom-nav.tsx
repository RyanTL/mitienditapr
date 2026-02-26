"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BackIcon, HomeIcon } from "@/components/icons";

import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "./nav-styles";
import { TwoItemBottomNav } from "./two-item-bottom-nav";

type BackHomeBottomNavProps = {
  fallbackHref?: string;
  homeHref?: string;
  containerClassName?: string;
};

export function BackHomeBottomNav({
  fallbackHref = "/",
  homeHref = "/",
  containerClassName = FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS,
}: BackHomeBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }, [fallbackHref, router]);

  return (
    <TwoItemBottomNav
      containerClassName={containerClassName}
      firstItem={{
        ariaLabel: "Volver",
        icon: <BackIcon />,
        onClick: handleGoBack,
      }}
      secondItem={{
        ariaLabel: "Ir a inicio",
        icon: <HomeIcon />,
        href: homeHref,
        isActive: pathname === homeHref,
      }}
    />
  );
}
