import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ajustes | Mitiendita PR",
};

import { AccountPageClient } from "@/app/(marketplace)/cuenta/account-page-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  email: string | null;
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
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const row = (profileData as Record<string, unknown> | null) ?? null;
  const profile: ProfileRow = {
    email: typeof row?.email === "string" ? row.email : null,
    full_name: typeof row?.full_name === "string" ? row.full_name : null,
    phone: typeof row?.phone === "string" ? row.phone : null,
    address: typeof row?.address === "string" ? row.address : null,
    zip_code: typeof row?.zip_code === "string" ? row.zip_code : null,
  };

  return (
    <AccountPageClient
      initialEmail={profile.email ?? user.email ?? ""}
      initialFullName={profile.full_name ?? ""}
      initialPhone={profile.phone ?? ""}
      initialAddress={profile.address ?? ""}
      initialZipCode={profile.zip_code ?? ""}
    />
  );
}
