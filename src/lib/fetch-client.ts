"use client";

type ErrorFactory = new (message: string, status: number) => Error;

export async function fetchJson<TResponse>(
  path: string,
  options: RequestInit = {},
  ErrorClass?: ErrorFactory,
): Promise<TResponse> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: options.cache ?? undefined,
  });

  const body = (await response.json().catch(() => null)) as
    | (TResponse & { error?: string })
    | null;

  if (!response.ok) {
    const message = body?.error ?? `Request failed (${response.status}).`;
    if (ErrorClass) {
      throw new ErrorClass(message, response.status);
    }
    throw new Error(message);
  }

  if (!body) {
    const message = "Respuesta invalida del servidor.";
    if (ErrorClass) {
      throw new ErrorClass(message, response.status);
    }
    throw new Error(message);
  }

  return body;
}
