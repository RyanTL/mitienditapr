export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const LOCAL_URL_ORIGIN = "http://localhost";

export function normalizeSafeAppPath(value: string | null | undefined) {
  if (!value || value.includes("\\")) {
    return "/";
  }

  try {
    const url = new URL(value, LOCAL_URL_ORIGIN);
    if (url.origin !== LOCAL_URL_ORIGIN || !url.pathname.startsWith("/")) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
