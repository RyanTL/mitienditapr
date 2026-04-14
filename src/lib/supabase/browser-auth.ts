"use client";

import type { Session } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RouterLike = {
  push: (href: string) => void;
};

function getNextPath(pathname: string | null | undefined) {
  return pathname && pathname.trim().length > 0 ? pathname : "/";
}

export function redirectToSignIn(
  router: RouterLike,
  pathname: string | null | undefined,
) {
  router.push(`/sign-in?next=${encodeURIComponent(getNextPath(pathname))}`);
}

export async function requireBrowserSession(
  router: RouterLike,
  pathname: string | null | undefined,
): Promise<Session | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirectToSignIn(router, pathname);
    return null;
  }

  return session;
}
