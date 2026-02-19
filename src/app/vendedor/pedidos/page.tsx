import { redirect } from "next/navigation";

import { VendorOrdersClient } from "@/components/vendor/vendor-orders-client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

export default async function VendorOrdersPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/pedidos");
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

  if (!snapshot.onboarding || snapshot.onboarding.status !== "completed") {
    redirect("/vendedor/onboarding");
  }

  return <VendorOrdersClient />;
}
