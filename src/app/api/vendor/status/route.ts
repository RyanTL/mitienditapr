import { NextResponse } from "next/server";

import { unauthorizedResponse } from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  if (!isVendorModeEnabled) {
    return NextResponse.json({ error: "Vendor mode is disabled." }, { status: 404 });
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Fallback to user-scoped client when secret key is not configured.
  }

  const snapshot = await getVendorStatusSnapshot({
    ...context,
    supabase: dataClient,
  });

  return NextResponse.json(snapshot);
}
