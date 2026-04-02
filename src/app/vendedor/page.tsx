import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

export default async function VendorIndexPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor");
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  const snapshot = await getVendorStatusSnapshot({
    ...context,
    supabase: dataClient,
  });

  const isOnboardingDone = snapshot.onboarding?.status === "completed";

  if (!snapshot.isVendor || !snapshot.hasShop || !isOnboardingDone) {
    redirect("/vendedor/onboarding");
  }

  redirect("/vendedor/panel");
}
