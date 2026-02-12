import Link from "next/link";

import { SettingsIcon } from "@/components/icons";

type ProfileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Lightweight account menu anchored to the top-left profile button.
 * This intentionally stays presentational so action handlers can be wired later.
 */
export function ProfileMenu({ isOpen, onClose }: ProfileMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        className="absolute inset-0 bg-black/15"
        aria-label="Cerrar menu de perfil"
        onClick={onClose}
      />

      <section className="absolute top-4 left-4 w-[min(86vw,320px)] rounded-[1.6rem] border border-[#e4e4e4] bg-white px-4 py-4 text-[#1a1a1a] shadow-[0_22px_54px_rgba(0,0,0,0.18)]">
        <header className="mb-2 px-1 pt-1 pb-3">
          <p className="text-lg font-bold leading-none">Mi cuenta</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">usuario@correo.com</p>
        </header>

        <nav>
          <ul className="space-y-0.5">
            <li>
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]">
                Cuenta
              </button>
            </li>
            <li>
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]">
                Guardados/favoritos
              </button>
            </li>
            <li>
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]">
                Seguidos
              </button>
            </li>
            <li>
              <Link
                href="/ordenes"
                className="block w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]"
              >
                Historial de ordenes
              </Link>
            </li>
            <li>
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]">
                Notificaciones
              </button>
            </li>
            <li>
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]">
                Blog
              </button>
            </li>

            <li className="my-2 border-t border-[#e7e7e7]" />

            <li>
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[#f4f4f4]">
                <SettingsIcon />
                Ajustes
              </button>
            </li>

            <li className="my-2 border-t border-[#e7e7e7]" />

            <li>
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium text-[#d12f1a] hover:bg-[#f4f4f4]">
                Log out
              </button>
            </li>
          </ul>
        </nav>
      </section>
    </div>
  );
}
