"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCatalogSeeded } from "@/lib/supabase/catalog-seed-client";
import { getCurrentProfileId } from "@/lib/supabase/favorites";

export const SHOP_FOLLOWS_CHANGED_EVENT = "mitienditapr:shop-follows-changed";
const LOCAL_SHOP_FOLLOWS_KEY_PREFIX = "mitienditapr.shop-follows";
const ALLOW_LOCAL_FOLLOWS_FALLBACK =
  process.env.NEXT_PUBLIC_ENABLE_LOCAL_FOLLOWS_FALLBACK === "true";

export type FollowedShopSummary = {
  shopId: string;
  slug: string;
  vendorName: string;
  rating: string;
  reviewCount: number;
};

type FollowRow = {
  shop_id: string;
};

type ShopRow = {
  id: string;
  slug: string;
  vendor_name: string;
  rating: number;
  review_count: number;
  is_active: boolean;
};

function notifyShopFollowsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SHOP_FOLLOWS_CHANGED_EVENT));
}

function isMissingShopFollowsTableError(error: { message: string } | null) {
  if (!error) {
    return false;
  }

  return error.message.includes("public.shop_follows");
}

function getLocalShopFollowsStorageKey(profileId: string) {
  return `${LOCAL_SHOP_FOLLOWS_KEY_PREFIX}:${profileId}`;
}

function getLocalFollowedShopIds(profileId: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(getLocalShopFollowsStorageKey(profileId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function saveLocalFollowedShopIds(profileId: string, shopIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getLocalShopFollowsStorageKey(profileId),
    JSON.stringify(shopIds),
  );
}

async function getShopBySlug(shopSlug: string) {
  await ensureCatalogSeeded();

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("shops")
    .select("id,slug,vendor_name,rating,review_count,is_active")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ShopRow | null) ?? null;
}

export async function fetchShopFollowState(shopSlug: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return {
      isFollowing: false,
      unauthorized: true,
    } as const;
  }

  const shop = await getShopBySlug(shopSlug);
  if (!shop?.is_active) {
    return {
      isFollowing: false,
      unauthorized: false,
    } as const;
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("shop_follows")
    .select("shop_id")
    .eq("profile_id", profileId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (ALLOW_LOCAL_FOLLOWS_FALLBACK && isMissingShopFollowsTableError(error)) {
    const localShopIds = getLocalFollowedShopIds(profileId);
    return {
      isFollowing: localShopIds.includes(shop.id),
      unauthorized: false,
    } as const;
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    isFollowing: Boolean(data),
    unauthorized: false,
  } as const;
}

export async function followShop(shopSlug: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const shop = await getShopBySlug(shopSlug);
  if (!shop?.is_active) {
    return { ok: false as const, unauthorized: false as const };
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("shop_follows").upsert(
    {
      profile_id: profileId,
      shop_id: shop.id,
    },
    {
      onConflict: "profile_id,shop_id",
    },
  );

  if (ALLOW_LOCAL_FOLLOWS_FALLBACK && isMissingShopFollowsTableError(error)) {
    const localShopIds = getLocalFollowedShopIds(profileId);
    const nextShopIds = localShopIds.includes(shop.id)
      ? localShopIds
      : [shop.id, ...localShopIds];

    saveLocalFollowedShopIds(profileId, nextShopIds);
    notifyShopFollowsChanged();
    return { ok: true as const, unauthorized: false as const };
  }

  if (error) {
    throw new Error(error.message);
  }

  notifyShopFollowsChanged();

  return { ok: true as const, unauthorized: false as const };
}

export async function unfollowShop(shopSlug: string) {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  const shop = await getShopBySlug(shopSlug);
  if (!shop) {
    return { ok: false as const, unauthorized: false as const };
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("shop_follows")
    .delete()
    .eq("profile_id", profileId)
    .eq("shop_id", shop.id);

  if (ALLOW_LOCAL_FOLLOWS_FALLBACK && isMissingShopFollowsTableError(error)) {
    const localShopIds = getLocalFollowedShopIds(profileId);
    const nextShopIds = localShopIds.filter((shopId) => shopId !== shop.id);

    saveLocalFollowedShopIds(profileId, nextShopIds);
    notifyShopFollowsChanged();
    return { ok: true as const, unauthorized: false as const };
  }

  if (error) {
    throw new Error(error.message);
  }

  notifyShopFollowsChanged();

  return { ok: true as const, unauthorized: false as const };
}

export async function fetchFollowedShops() {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return [] as FollowedShopSummary[];
  }

  const supabase = createSupabaseBrowserClient();
  const { data: followRows, error: followsError } = await supabase
    .from("shop_follows")
    .select("shop_id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  let shopIds: string[] = [];

  if (ALLOW_LOCAL_FOLLOWS_FALLBACK && isMissingShopFollowsTableError(followsError)) {
    shopIds = getLocalFollowedShopIds(profileId);
  } else if (followsError || !followRows) {
    throw new Error(followsError?.message ?? "No se pudieron cargar los seguidos.");
  } else {
    shopIds = (followRows as FollowRow[]).map((row) => row.shop_id);
  }

  if (shopIds.length === 0) {
    return [];
  }

  const { data: shopRows, error: shopsError } = await supabase
    .from("shops")
    .select("id,slug,vendor_name,rating,review_count,is_active")
    .in("id", shopIds);

  if (shopsError || !shopRows) {
    throw new Error(shopsError?.message ?? "No se pudieron cargar las tiendas.");
  }

  const shopById = new Map(
    (shopRows as ShopRow[])
      .filter((shop) => shop.is_active)
      .map((shop) => [shop.id, shop]),
  );

  return shopIds.flatMap((shopId) => {
    const shop = shopById.get(shopId);
    if (!shop) {
      return [];
    }

    return [
      {
        shopId: shop.id,
        slug: shop.slug,
        vendorName: shop.vendor_name,
        rating: Number(shop.rating).toFixed(1),
        reviewCount: shop.review_count,
      } satisfies FollowedShopSummary,
    ];
  });
}
