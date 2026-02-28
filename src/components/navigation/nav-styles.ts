export const BOTTOM_NAV_CONTAINER_CLASS =
  "w-fit rounded-[2.25rem] bg-[var(--color-white-95)] px-4 py-2.5 text-[var(--text-primary)] shadow-[0_14px_30px_var(--shadow-black-012)] backdrop-blur-md";

export const BOTTOM_NAV_LIST_CLASS = "flex items-center gap-3";

export const BOTTOM_NAV_BUTTON_BASE_CLASS =
  "flex h-[52px] w-[52px] items-center justify-center rounded-[1.125rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2";

export const BOTTOM_NAV_BUTTON_ACTIVE_CLASS = `${BOTTOM_NAV_BUTTON_BASE_CLASS} bg-[var(--color-black)] text-[var(--color-white)]`;

export const BOTTOM_NAV_BUTTON_INACTIVE_CLASS = `${BOTTOM_NAV_BUTTON_BASE_CLASS} text-[var(--color-carbon)]`;

export const FIXED_BOTTOM_LEFT_NAV_CONTAINER_CLASS = `fixed bottom-6 left-4 z-20 md:bottom-8 md:left-6 ${BOTTOM_NAV_CONTAINER_CLASS}`;

export const FLOATING_SEARCH_BUTTON_CLASS =
  "fixed right-20 bottom-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-white-95)] text-[var(--text-primary)] shadow-[0_14px_30px_var(--shadow-black-012)] backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 md:bottom-8 md:right-24";

export const FLOATING_CART_BUTTON_CLASS =
  "flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-white)] shadow-[0_8px_18px_var(--shadow-brand-024)] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2";

export function getBottomNavButtonClass(isActive = false) {
  return isActive ? BOTTOM_NAV_BUTTON_ACTIVE_CLASS : BOTTOM_NAV_BUTTON_INACTIVE_CLASS;
}
