"use client";

import { useState } from "react";

import { ShareIcon } from "@/components/icons";

import { ShopSharePopup } from "./shop-share-popup";

export function VendorShopShareAction() {
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSharePopupOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-gray)] px-3 py-2 text-sm font-semibold text-[var(--color-carbon)]"
      >
        <ShareIcon className="h-4 w-4" />
        Compartir mi tienda
      </button>

      <ShopSharePopup
        isOpen={isSharePopupOpen}
        onClose={() => setIsSharePopupOpen(false)}
        ownerMode
      />
    </>
  );
}

