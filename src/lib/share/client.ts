"use client";

import type {
  OwnerShopShareResponse,
  PublicShopShareResponse,
} from "@/lib/share/types";

type ErrorBody = {
  error?: string;
};

export class ShareRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ShareRequestError";
    this.status = status;
  }
}

async function fetchJson<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: options.cache ?? "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | (TResponse & ErrorBody)
    | null;

  if (!response.ok) {
    throw new ShareRequestError(
      body?.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  if (!body) {
    throw new ShareRequestError(
      "Respuesta invalida del servidor.",
      response.status,
    );
  }

  return body;
}

export function fetchPublicShopShare(shopSlug: string) {
  return fetchJson<PublicShopShareResponse>(
    `/api/shops/${encodeURIComponent(shopSlug)}/share`,
    {
      method: "GET",
    },
  );
}

export function fetchOwnerShopShare() {
  return fetchJson<OwnerShopShareResponse>("/api/vendor/shop/share", {
    method: "GET",
  });
}

