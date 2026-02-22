import Link from "next/link";

import { SearchIcon } from "@/components/icons";

import { FLOATING_SEARCH_BUTTON_CLASS } from "./nav-styles";

type FloatingSearchButtonProps = {
  onClick?: () => void;
  href?: string;
};

export function FloatingSearchButton({ onClick, href }: FloatingSearchButtonProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={FLOATING_SEARCH_BUTTON_CLASS}
        aria-label="Buscar"
      >
        <SearchIcon />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={FLOATING_SEARCH_BUTTON_CLASS}
      aria-label="Buscar"
      onClick={onClick}
    >
      <SearchIcon />
    </button>
  );
}
