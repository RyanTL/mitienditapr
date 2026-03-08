"use client";

import { useCallback, useMemo, useState } from "react";

import { ShareIcon } from "@/components/icons";

type ProductShareButtonProps = {
  shopSlug: string;
  productId: string;
  productName: string;
  className?: string;
};

function getProductUrl(shopSlug: string, productId: string) {
  if (typeof window === "undefined") {
    return `/${shopSlug}/producto/${productId}`;
  }

  return `${window.location.origin}/${shopSlug}/producto/${productId}`;
}

export function ProductShareButton({
  shopSlug,
  productId,
  productName,
  className,
}: ProductShareButtonProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const canUseNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  const handleShare = useCallback(async () => {
    const url = getProductUrl(shopSlug, productId);

    try {
      if (canUseNativeShare) {
        await navigator.share({
          title: productName,
          text: `Mira este producto: ${productName}`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 1600);
    } catch {
      // Ignore cancelled share actions.
    }
  }, [canUseNativeShare, productId, productName, shopSlug]);

  return (
    <button
      type="button"
      className={className}
      aria-label={hasCopied ? "Enlace copiado" : "Compartir producto"}
      onClick={() => void handleShare()}
      title={hasCopied ? "Enlace copiado" : "Compartir producto"}
    >
      <ShareIcon />
    </button>
  );
}
