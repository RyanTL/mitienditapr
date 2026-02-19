import { redirect } from "next/navigation";

import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function VendorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isVendorModeEnabled) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/vendedor/onboarding");
  }

  return children;
}
