"use client";

import { useMemo, useState } from "react";

import { ChevronDownIcon } from "@/components/icons";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

type ProductPurchasePanelProps = {
  shopSlug: string;
  productId: string;
};

export function ProductPurchasePanel({
  shopSlug,
  productId,
}: ProductPurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);

  const nextMinusQuantity = useMemo(() => Math.max(1, quantity - 1), [quantity]);
  const nextPlusQuantity = useMemo(() => quantity + 1, [quantity]);

  return (
    <>
      <button
        type="button"
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-carbon)]"
      >
        Ship to 00667
        <span className="inline-flex items-center justify-center">
          <ChevronDownIcon />
        </span>
      </button>

      <div className="mt-6">
        <p className="text-sm text-[var(--color-carbon)]">Cantidad</p>
        <div className="mt-1 inline-flex items-center gap-4 rounded-full border border-[var(--color-gray)] px-3 py-1 text-lg leading-none text-[var(--color-carbon)]">
          <button
            type="button"
            aria-label="Restar cantidad"
            onClick={() => setQuantity(nextMinusQuantity)}
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            aria-label="Sumar cantidad"
            onClick={() => setQuantity(nextPlusQuantity)}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <AddToCartButton
          shopSlug={shopSlug}
          productId={productId}
          quantity={quantity}
          className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-3xl font-bold text-[var(--color-white)] disabled:opacity-70 md:text-2xl"
        />
        <button
          type="button"
          className="w-full rounded-3xl bg-[var(--color-black)] px-6 py-3.5 text-3xl font-bold text-[var(--color-white)] md:text-2xl"
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
}
