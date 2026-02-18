"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { addProductToCart } from "@/lib/supabase/cart";

type AddToCartButtonProps = {
  shopSlug: string;
  productId: string;
  quantity?: number;
  className?: string;
};

export function AddToCartButton({
  shopSlug,
  productId,
  quantity = 1,
  className,
}: AddToCartButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleClick = async () => {
    setIsSubmitting(true);

    try {
      const result = await addProductToCart(shopSlug, productId, quantity);
      if (result.unauthorized) {
        const nextPath = pathname ?? "/";
        router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setIsAdded(true);
      timeoutRef.current = window.setTimeout(() => {
        setIsAdded(false);
      }, 1700);
      router.refresh();
    } catch (error) {
      console.error("No se pudo agregar al carrito:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isSubmitting}
      className={className}
      onClick={() => void handleClick()}
    >
      {isSubmitting ? "Agregando..." : isAdded ? "Anadido" : "Anadir al carrito"}
    </button>
  );
}
