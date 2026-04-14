type AppBaseUrlSource = {
  requestOrigin?: string;
};

const LOCAL_APP_BASE_URL = "http://localhost:3000";

function normalizeAppBaseUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const normalizedPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

function isLocalRequestOrigin(value: string | undefined) {
  const normalized = normalizeAppBaseUrl(value);
  if (!normalized) {
    return false;
  }

  const hostname = new URL(normalized).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getAppBaseUrl(source: AppBaseUrlSource = {}) {
  const configuredBaseUrl = normalizeAppBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isLocalRequestOrigin(source.requestOrigin)) {
    return normalizeAppBaseUrl(source.requestOrigin) ?? LOCAL_APP_BASE_URL;
  }

  return LOCAL_APP_BASE_URL;
}
