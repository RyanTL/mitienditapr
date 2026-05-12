"use client";

type LogContext = Record<string, unknown>;

export function reportClientError(
  scope: string,
  error: unknown,
  context: LogContext = {},
): void {
  try {
    const payload = {
      scope,
      message: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorStack: error instanceof Error ? error.stack ?? null : null,
      context: {
        ...context,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        url: typeof location !== "undefined" ? location.href : "",
      },
    };
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/client-log", blob);
      return;
    }
    void fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Telemetry must never throw.
  }
}
