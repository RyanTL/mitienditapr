import { redirect } from "next/navigation";

import { VendorSubscriptionClient } from "@/components/vendor/vendor-subscription-client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

export default async function VendorSubscriptionPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/suscripcion");
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

  const isSubscribed =
    snapshot.subscription?.status === "active" ||
    snapshot.subscription?.status === "trialing";

  if (isSubscribed) {
    redirect("/vendedor/panel");
  }

  return <VendorSubscriptionClient />;
}
