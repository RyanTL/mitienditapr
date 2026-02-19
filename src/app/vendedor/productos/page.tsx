import { redirect } from "next/navigation";

import { VendorProductsClient } from "@/components/vendor/vendor-products-client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

export default async function VendorProductsPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/productos");
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

  return <VendorProductsClient />;
}
