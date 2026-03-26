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
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
      >
        <ShareIcon className="h-4 w-4" />
        Compartir
      </button>

      <ShopSharePopup
        isOpen={isSharePopupOpen}
        onClose={() => setIsSharePopupOpen(false)}
        ownerMode
      />
    </>
  );
}

