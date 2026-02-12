import Link from "next/link";
import type { ReactNode } from "react";

import {
  BOTTOM_NAV_BUTTON_ACTIVE_CLASS,
  BOTTOM_NAV_BUTTON_INACTIVE_CLASS,
  BOTTOM_NAV_CONTAINER_CLASS,
  BOTTOM_NAV_LIST_CLASS,
} from "./nav-styles";

type NavItem = {
  ariaLabel: string;
  icon: ReactNode;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
};

type TwoItemBottomNavProps = {
  firstItem: NavItem;
  secondItem: NavItem;
  containerClassName?: string;
};

function NavItemButton({ item }: { item: NavItem }) {
  const className = item.isActive
    ? BOTTOM_NAV_BUTTON_ACTIVE_CLASS
    : BOTTOM_NAV_BUTTON_INACTIVE_CLASS;

  if (item.href) {
    return (
      <Link href={item.href} className={className} aria-label={item.ariaLabel}>
        {item.icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={item.ariaLabel}
      onClick={item.onClick}
    >
      {item.icon}
    </button>
  );
}

export function TwoItemBottomNav({
  firstItem,
  secondItem,
  containerClassName,
}: TwoItemBottomNavProps) {
  return (
    <nav className={containerClassName ?? BOTTOM_NAV_CONTAINER_CLASS}>
      <ul className={BOTTOM_NAV_LIST_CLASS}>
        <li>
          <NavItemButton item={firstItem} />
        </li>
        <li>
          <NavItemButton item={secondItem} />
        </li>
      </ul>
    </nav>
  );
}
