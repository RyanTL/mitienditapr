import type { NextConfig } from "next";

const DEFAULT_ALLOWED_DEV_ORIGINS = ["192.168.0.7"];

function getAllowedDevOrigins() {
  const configuredOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...DEFAULT_ALLOWED_DEV_ORIGINS, ...configuredOrigins]),
  );
}

function getSupabaseRemotePattern() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    const protocol = parsed.protocol.replace(":", "");

    if (protocol !== "http" && protocol !== "https") {
      return null;
    }

    return {
      protocol: protocol as "http" | "https",
      hostname: parsed.hostname,
    };
  } catch {
    return null;
  }
}

const supabaseRemotePattern = getSupabaseRemotePattern();
const allowedDevOrigins = getAllowedDevOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins,
  outputFileTracingRoot: process.cwd(),
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      ...(supabaseRemotePattern
        ? [
            {
              protocol: supabaseRemotePattern.protocol,
              hostname: supabaseRemotePattern.hostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
