import Link from "next/link";

import { CartIcon } from "@/components/icons";

import { FLOATING_CART_BUTTON_CLASS } from "./nav-styles";

type FloatingCartLinkProps = {
  href: string;
  count?: number;
  fixed?: boolean;
  className?: string;
};

export function FloatingCartLink({
  href,
  count = 1,
  fixed = true,
  className,
}: FloatingCartLinkProps) {
  const placementClass = fixed ? "fixed right-4 bottom-6 z-20" : "relative";
  const mergedClassName = [placementClass, FLOATING_CART_BUTTON_CLASS, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={mergedClassName} aria-label="Abrir carrito">
      <CartIcon />
      <span className="absolute top-1.5 right-1.5 rounded-full bg-white px-1.5 text-[10px] font-bold leading-4 text-[#4f46e5]">
        {count}
      </span>
    </Link>
  );
}
