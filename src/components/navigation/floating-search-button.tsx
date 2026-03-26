import Link from "next/link";

import { SearchIcon } from "@/components/icons";

import { FLOATING_SEARCH_BUTTON_CLASS, FLOATING_SEARCH_BUTTON_WITH_CART_CLASS } from "./nav-styles";

type FloatingSearchButtonProps = {
  onClick?: () => void;
  href?: string;
  hasCart?: boolean;
};

export function FloatingSearchButton({ onClick, href, hasCart = false }: FloatingSearchButtonProps) {
  const className = hasCart ? FLOATING_SEARCH_BUTTON_WITH_CART_CLASS : FLOATING_SEARCH_BUTTON_CLASS;

  if (href) {
    return (
      <Link href={href} className={className} aria-label="Buscar">
        <SearchIcon />
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label="Buscar" onClick={onClick}>
      <SearchIcon />
    </button>
  );
}
