import Link from "next/link";
import type { ReactNode } from "react";

import {
  BOTTOM_NAV_CONTAINER_CLASS,
  BOTTOM_NAV_LIST_CLASS,
  getBottomNavButtonClass,
} from "./nav-styles";

type NavItem = {
  ariaLabel: string;
  icon: ReactNode;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
};

type TwoItemBottomNavProps = {
  firstItem: NavItem;
  secondItem: NavItem;
  containerClassName?: string;
};

function NavItemButton({ item }: { item: NavItem }) {
  const className = [getBottomNavButtonClass(item.isActive), item.className]
    .filter(Boolean)
    .join(" ");

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={className}
        aria-label={item.ariaLabel}
        aria-current={item.isActive ? "page" : undefined}
      >
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
