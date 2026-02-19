"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChevronDownIcon, SettingsIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchFollowedShops,
  SHOP_FOLLOWS_CHANGED_EVENT,
  type FollowedShopSummary,
} from "@/lib/supabase/follows";

type ProfileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

type VendorMenuEntry = {
  href: string;
  label: string;
};

export function ProfileMenu({ isOpen, onClose }: ProfileMenuProps) {
  const [userEmail, setUserEmail] = useState("Cargando...");
  const [isFollowingListOpen, setIsFollowingListOpen] = useState(false);
  const [followedShops, setFollowedShops] = useState<FollowedShopSummary[]>([]);
  const [isLoadingFollowedShops, setIsLoadingFollowedShops] = useState(false);
  const [followedShopsError, setFollowedShopsError] = useState<string | null>(null);
  const [vendorMenuEntry, setVendorMenuEntry] = useState<VendorMenuEntry | null>(null);

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

  const refreshFollowedShops = useCallback(async () => {
    setIsLoadingFollowedShops(true);
    setFollowedShopsError(null);

    try {
      const shops = await fetchFollowedShops();
      setFollowedShops(shops);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus seguidos.";

      setFollowedShopsError(message);
    } finally {
      setIsLoadingFollowedShops(false);
    }
  }, []);

  const refreshVendorMenuEntry = useCallback(async () => {
    try {
      const response = await fetch("/api/vendor/status", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        setVendorMenuEntry(null);
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | {
            isVendor?: boolean;
            hasShop?: boolean;
          }
        | null;

      if (!body) {
        setVendorMenuEntry(null);
        return;
      }

      if (body.isVendor && body.hasShop) {
        setVendorMenuEntry({
          href: "/vendedor/panel",
          label: "Panel de vendedor",
        });
        return;
      }

      setVendorMenuEntry({
        href: "/vendedor/onboarding",
        label: "Conviertete en vendedor",
      });
    } catch {
      setVendorMenuEntry(null);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUserEmail();
      void refreshVendorMenuEntry();
      if (isFollowingListOpen) {
        void refreshFollowedShops();
      }
    }, 0);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshUserEmail();
      void refreshVendorMenuEntry();
      if (isFollowingListOpen) {
        void refreshFollowedShops();
      }
    });

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [
    isFollowingListOpen,
    refreshFollowedShops,
    refreshUserEmail,
    refreshVendorMenuEntry,
  ]);

  useEffect(() => {
    if (!isFollowingListOpen) {
      return;
    }

    const handleFollowsChanged = () => {
      void refreshFollowedShops();
    };

    window.addEventListener(SHOP_FOLLOWS_CHANGED_EVENT, handleFollowsChanged);

    return () => {
      window.removeEventListener(
        SHOP_FOLLOWS_CHANGED_EVENT,
        handleFollowsChanged,
      );
    };
  }, [isFollowingListOpen, refreshFollowedShops]);

  useEffect(() => {
    if (!isOpen) {
      setIsFollowingListOpen(false);
    }
  }, [isOpen]);

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
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-[var(--color-gray)]"
                onClick={() => {
                  const nextOpenState = !isFollowingListOpen;
                  setIsFollowingListOpen(nextOpenState);
                  if (nextOpenState) {
                    void refreshFollowedShops();
                  }
                }}
              >
                <span>Siguiendo</span>
                <ChevronDownIcon
                  className={[
                    "h-4 w-4 transition-transform duration-200",
                    isFollowingListOpen ? "rotate-180" : "rotate-0",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
                      Aun no sigues tiendas.
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
                Historial de ordenes
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
