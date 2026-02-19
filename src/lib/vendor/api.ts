import { NextResponse } from "next/server";

type ErrorPayload = {
  error: string;
};

export function unauthorizedResponse() {
  return NextResponse.json<ErrorPayload>({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json<ErrorPayload>({ error: message }, { status: 403 });
}

export function badRequestResponse(message: string) {
  return NextResponse.json<ErrorPayload>({ error: message }, { status: 400 });
}

export function serverErrorResponse(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json<ErrorPayload>({ error: message }, { status: 500 });
}

export async function parseJsonBody<TPayload>(request: Request) {
  const payload = (await request.json().catch(() => null)) as TPayload | null;
  return payload;
}
