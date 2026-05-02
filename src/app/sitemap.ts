import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mitienditapr.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/sign-up`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/devoluciones`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
