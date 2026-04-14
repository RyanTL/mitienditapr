"use client";

import type {
  OwnerShopShareResponse,
  PublicShopShareResponse,
} from "@/lib/share/types";
import { fetchJson } from "@/lib/fetch-client";

export class ShareRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ShareRequestError";
    this.status = status;
  }
}

export function fetchPublicShopShare(shopSlug: string) {
  return fetchJson<PublicShopShareResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/share`,
    {
      method: "GET",
    },
    ShareRequestError,
  );
}

export function fetchOwnerShopShare() {
  return fetchJson<OwnerShopShareResponse>("/api/vendor/shop/share", {
    method: "GET",
  }, ShareRequestError);
}

