import { SearchIcon } from "@/components/icons";

import { FLOATING_SEARCH_BUTTON_CLASS } from "./nav-styles";

export function FloatingSearchButton() {
  return (
    <button className={FLOATING_SEARCH_BUTTON_CLASS} aria-label="Buscar">
      <SearchIcon />
    </button>
  );
}
