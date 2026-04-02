"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CART_CHANGED_EVENT, type CartChangedEventDetail, addProductToCart } from "@/lib/supabase/cart";
import { requireBrowserSession, redirectToSignIn } from "@/lib/supabase/browser-auth";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleClick = async () => {
    setErrorMessage(null);

    if (quantity < 1) {
      setErrorMessage("La cantidad debe ser mayor a 0.");
      return;
    }

    const session = await requireBrowserSession(router, pathname);
    if (!session) {
      return;
    }

    // Optimistic: update UI immediately before server responds
    setIsSubmitting(true);
    setIsAdded(true);
    window.dispatchEvent(
      new CustomEvent<CartChangedEventDetail>(CART_CHANGED_EVENT, { detail: { delta: quantity } }),
    );

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsAdded(false);
    }, 1700);

    const rollbackOptimisticCart = () => {
      setIsAdded(false);
      window.dispatchEvent(
        new CustomEvent<CartChangedEventDetail>(CART_CHANGED_EVENT, { detail: { fullRefresh: true } }),
      );
    };

    try {
      const result = await addProductToCart(shopSlug, productId, quantity);
      if (result.unauthorized) {
        rollbackOptimisticCart();
        redirectToSignIn(router, pathname);
        return;
      }
    } catch (error) {
      rollbackOptimisticCart();
      console.error("No se pudo agregar al carrito:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el producto al carrito.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={isSubmitting}
        className={className}
        onClick={() => void handleClick()}
      >
        {isAdded ? "Anadido" : "Anadir al carrito"}
      </button>
      {errorMessage ? (
        <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
