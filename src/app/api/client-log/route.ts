import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ClientLogPayload = {
  scope?: unknown;
  message?: unknown;
  errorName?: unknown;
  errorStack?: unknown;
  context?: unknown;
};

function clip(value: unknown, max: number): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export async function POST(request: Request) {
  let body: ClientLogPayload = {};
  try {
    body = (await request.json()) as ClientLogPayload;
  } catch {
    body = {};
  }

  const ua = request.headers.get("user-agent") ?? "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

  console.warn(
    `[client-log] scope=${clip(body.scope, 64)} name=${clip(body.errorName, 64)} msg=${clip(body.message, 400)} ctx=${clip(body.context, 800)} stack=${clip(body.errorStack, 600)} ua="${clip(ua, 200)}" ip=${ip}`,
  );

  return NextResponse.json({ ok: true });
}
