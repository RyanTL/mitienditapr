import { redirect } from "next/navigation";

import { VendorShopSettingsClient } from "@/components/vendor/vendor-shop-settings-client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

export default async function VendorShopSettingsPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/tienda");
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

  if (!isOnboardingDone) {
    redirect("/vendedor/onboarding");
  }

  return <VendorShopSettingsClient />;
}
