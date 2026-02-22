"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BackIcon, HomeIcon } from "@/components/icons";
import { FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS } from "@/components/navigation/nav-styles";
import { TwoItemBottomNav } from "@/components/navigation/two-item-bottom-nav";

export function VendorBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  return (
    <TwoItemBottomNav
      containerClassName={FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS}
      firstItem={{
        ariaLabel: "Volver",
        icon: <BackIcon />,
        onClick: handleGoBack,
      }}
      secondItem={{
        ariaLabel: "Ir a inicio",
        icon: <HomeIcon />,
        href: "/",
        isActive: pathname === "/",
      }}
    />
  );
}
