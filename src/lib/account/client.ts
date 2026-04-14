"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AccountSnapshot = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  zipCode: string;
};

export type UpdateAccountProfileInput = {
  fullName: string;
  phone: string;
  address: string;
  zipCode: string;
};

export type SaveCheckoutProfileInput = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  zipCode?: string | null;
};

function toNullableTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isMissingProfilesColumn(error: { message?: string } | null | undefined, columnName: string) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes(`could not find the '${columnName.toLowerCase()}' column`);
}

async function updateProfilesRow(
  userId: string,
  input: {
    fullName: string;
    phone: string;
    address: string;
    zipCode?: string;
    email?: string;
  },
) {
  const supabase = createSupabaseBrowserClient();
  const buildPayload = (includeZipCode: boolean) => ({
    full_name: toNullableTrimmed(input.fullName),
    phone: toNullableTrimmed(input.phone),
    address: toNullableTrimmed(input.address),
    ...(includeZipCode ? { zip_code: toNullableTrimmed(input.zipCode ?? "") } : {}),
    ...(input.email !== undefined ? { email: toNullableTrimmed(input.email) } : {}),
  });

  let { error } = await supabase
    .from("profiles")
    .update(buildPayload(true))
    .eq("id", userId);

  if (isMissingProfilesColumn(error, "zip_code")) {
    const retry = await supabase
      .from("profiles")
      .update(buildPayload(false))
      .eq("id", userId);
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }
}

async function requireAuthenticatedBrowserUser() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (session?.user) {
    return {
      supabase,
      user: session.user,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message ?? "No has iniciado sesion.");
  }

  return {
    supabase,
    user,
  };
}

export async function fetchAccountSnapshot(): Promise<AccountSnapshot> {
  const { supabase, user } = await requireAuthenticatedBrowserUser();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const row = (profileData as Record<string, unknown> | null) ?? null;
  const profileEmail = typeof row?.email === "string" ? row.email.trim() : "";
  const authEmail =
    user.email ??
    (typeof user.user_metadata.email === "string" ? user.user_metadata.email : "");

  return {
    userId: user.id,
    email: profileEmail || authEmail,
    fullName: typeof row?.full_name === "string" ? row.full_name : "",
    phone: typeof row?.phone === "string" ? row.phone : "",
    address: typeof row?.address === "string" ? row.address : "",
    zipCode: typeof row?.zip_code === "string" ? row.zip_code : "",
  };
}

export async function updateAccountProfile(input: UpdateAccountProfileInput) {
  const snapshot = await fetchAccountSnapshot();
  await updateProfilesRow(snapshot.userId, input);
}

export async function requestAccountEmailChange(nextEmail: string) {
  const supabase = createSupabaseBrowserClient();
  const email = nextEmail.trim().toLowerCase();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveCheckoutProfile(input: SaveCheckoutProfileInput) {
  const snapshot = await fetchAccountSnapshot();
  const nextFullName =
    input.fullName !== undefined ? (input.fullName ?? "") : snapshot.fullName;
  const nextPhone = input.phone !== undefined ? (input.phone ?? "") : snapshot.phone;
  const nextAddress =
    input.address !== undefined ? (input.address ?? "") : snapshot.address;
  const nextZipCode =
    input.zipCode !== undefined ? (input.zipCode ?? "") : snapshot.zipCode;
  const nextEmail =
    input.email !== undefined ? (input.email ?? "").trim().toLowerCase() : snapshot.email;

  await updateProfilesRow(snapshot.userId, {
    fullName: nextFullName,
    phone: nextPhone,
    address: nextAddress,
    zipCode: nextZipCode,
    email: nextEmail,
  });

  const currentEmail = snapshot.email.trim().toLowerCase();
  if (nextEmail && nextEmail !== currentEmail) {
    await requestAccountEmailChange(nextEmail);
  }
}

export async function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const { supabase, user } = await requireAuthenticatedBrowserUser();
  const email =
    user.email ??
    (typeof user.user_metadata.email === "string" ? user.user_metadata.email : null);

  if (!email) {
    throw new Error("No pudimos validar tu sesión. Entra de nuevo e intenta otra vez.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: input.currentPassword,
  });

  if (signInError) {
    throw new Error("La contraseña actual no es correcta.");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (updateError) {
    throw new Error(updateError.message);
  }
}
