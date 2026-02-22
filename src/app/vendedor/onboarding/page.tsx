import { redirect } from "next/navigation";

import { VendorOnboardingClient } from "@/components/vendor/vendor-onboarding-client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

export default async function VendorOnboardingPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/onboarding");
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

  if (snapshot.onboarding?.status === "completed") {
    redirect("/vendedor/panel");
  }

  return <VendorOnboardingClient />;
}
