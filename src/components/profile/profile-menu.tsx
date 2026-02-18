"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SettingsIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProfileMenu({ isOpen, onClose }: ProfileMenuProps) {
  const [userEmail, setUserEmail] = useState("Cargando...");

  const refreshUserEmail = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email) {
      setUserEmail("No has iniciado sesion");
      return;
    }

    setUserEmail(user.email);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUserEmail();
    }, 0);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshUserEmail();
    });

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [refreshUserEmail]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button type="button"
        className="absolute inset-0 bg-[var(--overlay-black-015)]"
        aria-label="Cerrar menu de perfil"
        onClick={onClose}
      />

      <section className="absolute top-4 left-4 w-[min(86vw,320px)] rounded-[1.6rem] border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-4 text-[var(--color-carbon)] shadow-[0_22px_54px_var(--shadow-black-018)]">
        <header className="mb-2 px-1 pt-1 pb-3">
          <p className="text-lg font-bold leading-none">Mi cuenta</p>
          <p className="mt-1 text-sm text-[var(--color-carbon)]">{userEmail}</p>
        </header>

        <nav>
          <ul className="space-y-0.5">
            <li>
              <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]">
                Cuenta
              </button>
            </li>
            <li>
              <Link
                href="/favoritos"
                onClick={onClose}
                className="block w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
              >
                Guardados/favoritos
              </Link>
            </li>
            <li>
              <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]">
                Seguidos
              </button>
            </li>
            <li>
              <Link
                href="/ordenes"
                onClick={onClose}
                className="block w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
              >
                Historial de ordenes
              </Link>
            </li>
            <li>
              <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]">
                Notificaciones
              </button>
            </li>
            <li>
              <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]">
                Blog
              </button>
            </li>

            <li className="my-2 border-t border-[var(--color-gray)]" />

            <li>
              <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]">
                <SettingsIcon />
                Ajustes
              </button>
            </li>

            <li className="my-2 border-t border-[var(--color-gray)]" />

            <li>
              <SignOutButton
                onSignedOut={onClose}
                className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium text-[var(--color-danger)] hover:bg-[var(--color-gray)]"
              />
            </li>
          </ul>
        </nav>
      </section>
    </div>
  );
}
