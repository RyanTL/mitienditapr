import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/resend";

function normalizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }
  return nextPath;
}

function isNewUser(user: { created_at?: string } | null | undefined): boolean {
  if (!user?.created_at) return false;
  // A user created within the last 60 seconds is considered new.
  // This covers both email-confirmation signups and Google OAuth signups.
  return Date.now() - new Date(user.created_at).getTime() < 60_000;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  // OAuth flows pass next via a short-lived cookie (no query params in redirectTo).
  // Email flows pass next via the URL query param.
  const cookieStore = await cookies();
  const nextFromCookie = cookieStore.get("oauth_next")?.value;
  const nextPath = normalizeNextPath(
    requestUrl.searchParams.get("next") ??
      (nextFromCookie ? decodeURIComponent(nextFromCookie) : null),
  );

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Send welcome email to new users — works for both email confirmation
    // (type === "signup") and Google OAuth (no type param, but recently created)
    if (data.user?.email && isNewUser(data.user)) {
      void sendWelcomeEmail({
        to: data.user.email,
        name: (data.user.user_metadata?.full_name as string | undefined) ?? null,
      });
    }
  }

  // Password recovery links redirect to the reset-password page
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  if (nextFromCookie) {
    response.cookies.delete("oauth_next");
  }
  return response;
}
