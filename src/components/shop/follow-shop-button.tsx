"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchShopFollowState,
  followShop,
  SHOP_FOLLOWS_CHANGED_EVENT,
  unfollowShop,
} from "@/lib/supabase/follows";

type FollowShopButtonProps = {
  shopSlug: string;
  className?: string;
};

export function FollowShopButton({ shopSlug, className }: FollowShopButtonProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const stateRequestVersionRef = useRef(0);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  const refreshFollowState = useCallback(async () => {
    const requestVersion = stateRequestVersionRef.current + 1;
    stateRequestVersionRef.current = requestVersion;

    try {
      const state = await fetchShopFollowState(shopSlug);
      if (stateRequestVersionRef.current !== requestVersion || isSubmittingRef.current) {
        return;
      }
      setIsFollowing(state.isFollowing);
    } catch (error) {
      console.error("No se pudo cargar el estado de seguimiento:", error);
    }
  }, [shopSlug]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshFollowState();
    }, 0);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshFollowState();
    });

    const handleShopFollowsChanged = () => {
      void refreshFollowState();
    };

    window.addEventListener(SHOP_FOLLOWS_CHANGED_EVENT, handleShopFollowsChanged);

    return () => {
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
      window.removeEventListener(
        SHOP_FOLLOWS_CHANGED_EVENT,
        handleShopFollowsChanged,
      );
    };
  }, [refreshFollowState]);

  const handleToggleFollow = async () => {
    if (isSubmitting) {
      return;
    }

    const previousState = isFollowing;
    const nextState = !previousState;

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setIsFollowing(nextState);

    try {
      const result = nextState
        ? await followShop(shopSlug)
        : await unfollowShop(shopSlug);

      if (result.unauthorized) {
        setIsFollowing(previousState);
        const nextPath = pathname ?? `/${shopSlug}`;
        router.push(`/sign-in?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (!result.ok) {
        setIsFollowing(previousState);
      }
    } catch (error) {
      console.error("No se pudo actualizar el seguimiento:", error);
      setIsFollowing(previousState);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      void refreshFollowState();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggleFollow()}
      disabled={isSubmitting}
      className={[
        "inline-flex items-center rounded-full border px-3 py-2 text-sm font-semibold",
        isFollowing
          ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-white)]"
          : "border-[var(--color-gray)] bg-[var(--color-white)] text-[var(--color-carbon)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={isFollowing ? "Dejar de seguir vendedor" : "Seguir vendedor"}
    >
      <span className="inline-flex items-center gap-1.5">
        {isFollowing && !isSubmitting ? <CheckIcon className="h-4 w-4" /> : null}
        {isSubmitting ? "Guardando..." : isFollowing ? "Seguido" : "Seguir"}
      </span>
    </button>
  );
}
