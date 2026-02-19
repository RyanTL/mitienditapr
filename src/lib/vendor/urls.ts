type AppBaseUrlSource = {
  requestOrigin?: string;
};

export function getAppBaseUrl(source: AppBaseUrlSource = {}) {
  if (source.requestOrigin) {
    return source.requestOrigin;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return "http://localhost:3000";
}
