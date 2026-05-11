import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/resend";
import { normalizeSafeAppPath } from "@/lib/utils";

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
  const nextPath = normalizeSafeAppPath(
    requestUrl.searchParams.get("next") ??
      (nextFromCookie ? decodeURIComponent(nextFromCookie) : null),
  );

  let exchangeFailed = false;
  let wasNewUser = false;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      exchangeFailed = true;
    }

    // Send welcome email to new users — works for both email confirmation
    // (type === "signup") and Google OAuth (no type param, but recently created)
    if (data.user?.email && isNewUser(data.user)) {
      wasNewUser = true;
      sendWelcomeEmail({
        to: data.user.email,
        name: (data.user.user_metadata?.full_name as string | undefined) ?? null,
      }).catch((emailError) => {
        console.error("[email] failed to send welcome email", {
          userId: data.user?.id,
          error: emailError,
        });
      });
    }
  } else if (type !== "recovery") {
    // No code AND not a recovery link → something went wrong (link expired, already used, malformed)
    exchangeFailed = true;
  }

  // Password recovery links redirect to the reset-password page
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
  }

  // Link expired / invalid → send to sign-in with an explicit error banner
  if (exchangeFailed) {
    return NextResponse.redirect(
      new URL("/sign-in?error=verification", requestUrl.origin),
    );
  }

  // Success → redirect to original destination with a banner flag so the user
  // sees explicit confirmation (otherwise they'd silently land on home wondering
  // whether anything happened).
  const destination = new URL(nextPath, requestUrl.origin);
  if (wasNewUser || type === "signup") {
    destination.searchParams.set("confirmado", "1");
  } else if (!type) {
    // OAuth sign-in (no type param, existing user) — light "logged in" feedback.
    destination.searchParams.set("sesion", "1");
  }

  const response = NextResponse.redirect(destination);
  if (nextFromCookie) {
    response.cookies.delete("oauth_next");
  }
  return response;
}
