"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AccountSnapshot = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
};

export type UpdateAccountProfileInput = {
  fullName: string;
  phone: string;
  address: string;
};

function toNullableTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function fetchAccountSnapshot(): Promise<AccountSnapshot> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    throw new Error(userError?.message ?? "No has iniciado sesion.");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,phone,address")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profile = (profileData as
    | {
        full_name: string | null;
        phone: string | null;
        address: string | null;
      }
    | null) ?? {
    full_name: null,
    phone: null,
    address: null,
  };

  return {
    userId: user.id,
    email: user.email,
    fullName: profile.full_name ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  };
}

export async function updateAccountProfile(input: UpdateAccountProfileInput) {
  const snapshot = await fetchAccountSnapshot();
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: toNullableTrimmed(input.fullName),
      phone: toNullableTrimmed(input.phone),
      address: toNullableTrimmed(input.address),
    })
    .eq("id", snapshot.userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function requestAccountEmailChange(nextEmail: string) {
  const supabase = createSupabaseBrowserClient();
  const email = nextEmail.trim().toLowerCase();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    throw new Error(error.message);
  }
}

export async function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const snapshot = await fetchAccountSnapshot();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: snapshot.email,
    password: input.currentPassword,
  });

  if (signInError) {
    throw new Error("La contrasena actual no es correcta.");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (updateError) {
    throw new Error(updateError.message);
  }
}

