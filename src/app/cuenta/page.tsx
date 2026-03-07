import { redirect } from "next/navigation";

import { AccountPageClient } from "@/app/cuenta/account-page-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  address: string | null;
};

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in?next=/cuenta");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name,phone,address")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData as ProfileRow | null) ?? {
    full_name: null,
    phone: null,
    address: null,
  };

  return (
    <AccountPageClient
      initialEmail={user.email ?? ""}
      initialFullName={profile.full_name ?? ""}
      initialPhone={profile.phone ?? ""}
      initialAddress={profile.address ?? ""}
    />
  );
}

