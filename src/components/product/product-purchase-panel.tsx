"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ChevronDownIcon } from "@/components/icons";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ShippingAddressSheet } from "@/components/product/shipping-address-sheet";
import { requireBrowserSession, redirectToSignIn } from "@/lib/supabase/browser-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addProductToCart } from "@/lib/supabase/cart";

type ProductPurchasePanelProps = {
  shopSlug: string;
  productId: string;
};

type ShippingInfo = {
  zipCode: string;
  address: string;
};

export function ProductPurchasePanel({
  shopSlug,
  productId,
}: ProductPurchasePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [quantity, setQuantity] = useState(1);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [shipping, setShipping] = useState<ShippingInfo | null>(null);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [buyNowError, setBuyNowError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadShippingInfo() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("zip_code,address")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      const row = data as { zip_code: string | null; address: string | null } | null;
      setShipping({
        zipCode: row?.zip_code ?? "",
        address: row?.address ?? "",
      });
    }

    void loadShippingInfo();
    return () => { cancelled = true; };
  }, []);

  async function handleOpenAddressSheet() {
    const session = await requireBrowserSession(router, pathname);
    if (!session) {
      return;
    }

    setIsAddressSheetOpen(true);
  }

  async function handleBuyNow() {
    setIsBuyingNow(true);
    setBuyNowError(null);

    try {
      const result = await addProductToCart(shopSlug, productId, quantity);

      if (result.unauthorized) {
        redirectToSignIn(router, pathname);
        return;
      }

      router.push(`/${shopSlug}/carrito`);
    } catch (error) {
      setBuyNowError(
        error instanceof Error ? error.message : "No se pudo procesar. Intenta de nuevo.",
      );
    } finally {
      setIsBuyingNow(false);
    }
  }

  const nextMinusQuantity = Math.max(1, quantity - 1);
  const nextPlusQuantity = quantity + 1;

  const hasZipCode = Boolean(shipping?.zipCode);
  const shippingLabel = hasZipCode
    ? `Enviar a ${shipping!.zipCode}`
    : "Agregar dirección";

  return (
    <>
      <button
        type="button"
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-carbon)] hover:opacity-70 transition-opacity"
        onClick={() => void handleOpenAddressSheet()}
      >
        {shippingLabel}
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

      {buyNowError ? (
        <p className="mt-3 text-sm text-[var(--color-danger)]">{buyNowError}</p>
      ) : null}

      <div className="mt-8 space-y-3">
        <AddToCartButton
          shopSlug={shopSlug}
          productId={productId}
          quantity={quantity}
          className="w-full rounded-3xl bg-[var(--color-brand)] px-6 py-3.5 text-3xl font-bold text-[var(--color-white)] disabled:opacity-70 md:text-2xl"
        />
        <button
          type="button"
          disabled={isBuyingNow}
          onClick={() => void handleBuyNow()}
          className="w-full rounded-3xl bg-[var(--color-black)] px-6 py-3.5 text-3xl font-bold text-[var(--color-white)] disabled:opacity-70 md:text-2xl"
        >
          {isBuyingNow ? "Procesando..." : "Comprar ahora"}
        </button>
      </div>

      <ShippingAddressSheet
        isOpen={isAddressSheetOpen}
        onClose={() => setIsAddressSheetOpen(false)}
        initialZipCode={shipping?.zipCode ?? ""}
        initialAddress={shipping?.address ?? ""}
        onSaved={(zipCode, address) => setShipping({ zipCode, address })}
      />
    </>
  );
}
