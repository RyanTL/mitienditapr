import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ajustes | Mitiendita PR",
};

import { AccountPageClient } from "@/app/(marketplace)/cuenta/account-page-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  zip_code: string | null;
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
    .select("full_name,phone,address,zip_code")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData as ProfileRow | null) ?? {
    full_name: null,
    phone: null,
    address: null,
    zip_code: null,
  };

  return (
    <AccountPageClient
      initialEmail={user.email ?? ""}
      initialFullName={profile.full_name ?? ""}
      initialPhone={profile.phone ?? ""}
      initialAddress={profile.address ?? ""}
      initialZipCode={profile.zip_code ?? ""}
    />
  );
}

