type WindowEntry = {
  count: number;
  resetAt: number;
};

// In-memory store shared within a single serverless instance.
// Provides basic abuse protection for MVP; not a substitute for edge-level rate limiting.
const store = new Map<string, WindowEntry>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  request: Request,
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number },
): { allowed: boolean } {
  const ip = getClientIp(request);
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = store.get(storeKey);

  if (!entry || now > entry.resetAt) {
    store.set(storeKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}
