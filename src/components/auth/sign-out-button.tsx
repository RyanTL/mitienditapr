"use client";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
  onSignedOut?: () => void;
};

export function SignOutButton({ className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
          onSignedOut?.();
          router.push("/sign-in");
          router.refresh();
        } catch (error) {
          console.error("No se pudo cerrar sesion:", error);
        }
      }}
    >
      Cerrar sesion
    </button>
  );
}
