import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ClientLogPayload = {
  scope?: unknown;
  message?: unknown;
  errorName?: unknown;
  errorStack?: unknown;
  context?: unknown;
};

function str(value: unknown, max = 400): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export async function POST(request: Request) {
  let body: ClientLogPayload = {};
  try {
    body = (await request.json()) as ClientLogPayload;
  } catch {
    body = {};
  }

  const ua = request.headers.get("user-agent") ?? "";
  const id = Math.random().toString(36).slice(2, 8);

  // Emit one short line per field so log viewers that truncate the
  // "message" column at ~30 chars still show meaningful values.
  console.warn(`[clog ${id}] scope=${str(body.scope, 80)}`);
  console.warn(`[clog ${id}] name=${str(body.errorName, 80)}`);
  console.warn(`[clog ${id}] msg=${str(body.message, 200)}`);
  console.warn(`[clog ${id}] ctx=${str(body.context, 400)}`);
  console.warn(`[clog ${id}] ua=${str(ua, 200)}`);
  if (body.errorStack) {
    console.warn(`[clog ${id}] stack=${str(body.errorStack, 400)}`);
  }

  return NextResponse.json({ ok: true });
}
