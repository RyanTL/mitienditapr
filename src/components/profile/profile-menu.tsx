"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChevronDownIcon, SettingsIcon } from "@/components/icons";
import { getUserInitial } from "@/hooks/use-auth-user";
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";
import { fetchVendorStatus } from "@/lib/vendor/client";
import { cn } from "@/lib/utils";
import {
  fetchFollowedShops,
  SHOP_FOLLOWS_CHANGED_EVENT,
  type FollowedShopSummary,
} from "@/lib/supabase/follows";

async function fetchVendorMenuEntry(): Promise<VendorMenuEntry | null> {
  try {
    const status = await fetchVendorStatus();
    if (status.hasShop) {
      return { href: "/vendedor", label: "Maneja tu tienda" };
    }

    return { href: "/vendedor/onboarding", label: "Conviértete en vendedor" };
  } catch {
    return null;
  }
}

type ProfileMenuProps = {
  user: User | null;
  isAuthLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  desktopPosition?: "sidebar";
};

type VendorMenuEntry = {
  href: string;
  label: string;
};

// ─── Guest view ────────────────────────────────────────────────────────────

function GuestMenuContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      <header className="mb-4 px-1 pt-1 pb-3 border-b border-[var(--color-gray)]">
        <p className="text-lg font-bold leading-none text-[var(--color-carbon)]">Bienvenido</p>
        <p className="mt-1 text-sm text-[var(--color-gray-500)]">
          Inicia sesión para acceder a tu cuenta.
        </p>
      </header>

      <div className="space-y-2">
        <Link
          href="/sign-in"
          onClick={onClose}
          className="block w-full rounded-2xl bg-[var(--color-brand)] px-4 py-3 text-center text-base font-semibold text-[var(--color-white)]"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/sign-up"
          onClick={onClose}
          className="block w-full rounded-2xl border border-[var(--color-gray-border)] bg-[var(--color-white)] px-4 py-3 text-center text-base font-semibold text-[var(--color-carbon)]"
        >
          Crear cuenta
        </Link>
      </div>
    </>
  );
}

// ─── Authenticated view ─────────────────────────────────────────────────────

function AuthMenuContent({
  userEmail,
  vendorMenuEntry,
  onClose,
}: {
  userEmail: string;
  vendorMenuEntry: VendorMenuEntry | null;
  onClose: () => void;
}) {
  const [isFollowingListOpen, setIsFollowingListOpen] = useState(false);
  const [followedShops, setFollowedShops] = useState<FollowedShopSummary[]>([]);
  const [isLoadingFollowedShops, setIsLoadingFollowedShops] = useState(false);
  const [followedShopsError, setFollowedShopsError] = useState<string | null>(null);

  const refreshFollowedShops = useCallback(async () => {
    setIsLoadingFollowedShops(true);
    setFollowedShopsError(null);
    try {
      const shops = await fetchFollowedShops();
      setFollowedShops(shops);
    } catch (error) {
      setFollowedShopsError(
        error instanceof Error ? error.message : "No se pudieron cargar tus seguidos.",
      );
    } finally {
      setIsLoadingFollowedShops(false);
    }
  }, []);

  useEffect(() => {
    const handleFollowsChanged = () => { void refreshFollowedShops(); };
    window.addEventListener(SHOP_FOLLOWS_CHANGED_EVENT, handleFollowsChanged);
    return () => { window.removeEventListener(SHOP_FOLLOWS_CHANGED_EVENT, handleFollowsChanged); };
  }, [refreshFollowedShops]);

  return (
    <>
      <header className="mb-2 px-1 pt-1 pb-3">
        <p className="text-sm text-[var(--color-gray-500)]">{userEmail}</p>
      </header>

      <nav>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/favoritos"
              onClick={onClose}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
            >
              Favoritos
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
              onClick={() => {
                const next = !isFollowingListOpen;
                setIsFollowingListOpen(next);
                if (next) void refreshFollowedShops();
              }}
            >
              <span>Seguidos</span>
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isFollowingListOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            {isFollowingListOpen ? (
              <div className="mt-2 rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray)] p-2">
                {isLoadingFollowedShops ? (
                  <p className="px-2 py-2 text-xs text-[var(--color-carbon)]">Cargando...</p>
                ) : followedShopsError ? (
                  <p className="px-2 py-2 text-xs text-[var(--color-danger)]">{followedShopsError}</p>
                ) : followedShops.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-[var(--color-carbon)]">
                    Aún no sigues tiendas.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {followedShops.map((shop) => (
                      <li key={shop.shopId}>
                        <Link
                          href={`/${shop.slug}`}
                          onClick={onClose}
                          className="block rounded-xl bg-[var(--color-white)] px-3 py-2"
                        >
                          <p className="truncate text-sm font-semibold text-[var(--color-carbon)]">
                            {shop.vendorName}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--color-carbon)]">
                            {shop.rating} ★ ({shop.reviewCount})
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
          <li>
            <Link
              href="/ordenes"
              onClick={onClose}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
            >
              Historial de órdenes
            </Link>
          </li>
          {vendorMenuEntry ? (
            <li>
              <Link
                href={vendorMenuEntry.href}
                onClick={onClose}
                className="block w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
              >
                {vendorMenuEntry.label}
              </Link>
            </li>
          ) : null}

          <li className="my-2 border-t border-[var(--color-gray)]" />

          <li>
            <Link
              href="/cuenta"
              onClick={onClose}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
            >
              <SettingsIcon />
              Ajustes
            </Link>
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
    </>
  );
}

// ─── Main ProfileMenu ───────────────────────────────────────────────────────

export function ProfileMenu({
  user,
  isAuthLoading,
  isOpen,
  onClose,
  desktopPosition,
}: ProfileMenuProps) {
  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  // Prefetch vendor status as soon as the user is known — before the menu ever opens.
  // The ref prevents re-fetching on every re-render; it resets when the user changes.
  const [vendorMenuEntry, setVendorMenuEntry] = useState<VendorMenuEntry | null>(null);
  const vendorFetchedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      // Sign-out: clear the cached entry on the next tick to avoid direct setState in effect
      const id = window.setTimeout(() => {
        vendorFetchedForUserRef.current = null;
        setVendorMenuEntry(null);
      }, 0);
      return () => window.clearTimeout(id);
    }
    if (vendorFetchedForUserRef.current === user.id) return;
    vendorFetchedForUserRef.current = user.id;
    void fetchVendorMenuEntry().then(setVendorMenuEntry);
  }, [user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-015)]"
        aria-label="Cerrar menú de perfil"
        onClick={onClose}
      />

      <section
        className={cn(
          "absolute w-[min(86vw,320px)] rounded-[1.6rem] border border-[var(--color-gray)] bg-[var(--color-white)] px-4 py-4 text-[var(--color-carbon)] shadow-[0_22px_54px_var(--shadow-black-018)]",
          desktopPosition === "sidebar"
            ? "top-4 left-4 md:top-6 md:left-6 lg:top-auto lg:bottom-4 lg:left-[256px] lg:w-[320px]"
            : "top-4 left-4 md:top-6 md:left-6 md:w-[min(46vw,360px)]",
        )}
      >
        {isAuthLoading ? (
          <div className="py-4 text-center text-sm text-[var(--color-gray-500)]">Cargando...</div>
        ) : user ? (
          <AuthMenuContent
            userEmail={user.email ?? ""}
            vendorMenuEntry={vendorMenuEntry}
            onClose={onClose}
          />
        ) : (
          <GuestMenuContent onClose={onClose} />
        )}
      </section>
    </div>
  );
}

export { getUserInitial };
