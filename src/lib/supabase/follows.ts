"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentProfileId } from "@/lib/supabase/favorites";

export const SHOP_FOLLOWS_CHANGED_EVENT = "mitienditapr:shop-follows-changed";

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

export type ShopFollowsChangedDetail = {
  shopId?: string;
  shopSlug?: string;
  isFollowing?: boolean;
};

function notifyShopFollowsChanged(detail?: ShopFollowsChangedDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ShopFollowsChangedDetail>(SHOP_FOLLOWS_CHANGED_EVENT, { detail }),
  );
}

async function getShopBySlug(shopSlug: string) {
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

  if (error) {
    throw new Error(error.message);
  }

  return {
    isFollowing: Boolean(data),
    unauthorized: false,
  } as const;
}

export async function followShop(shopSlug: string) {
  const [profileId, shop] = await Promise.all([
    getCurrentProfileId(),
    getShopBySlug(shopSlug),
  ]);

  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

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

  if (error) {
    throw new Error(error.message);
  }

  notifyShopFollowsChanged({
    shopId: shop.id,
    shopSlug,
    isFollowing: true,
  });

  return { ok: true as const, unauthorized: false as const };
}

export async function unfollowShop(shopSlug: string) {
  const [profileId, shop] = await Promise.all([
    getCurrentProfileId(),
    getShopBySlug(shopSlug),
  ]);

  if (!profileId) {
    return { ok: false as const, unauthorized: true as const };
  }

  if (!shop) {
    return { ok: false as const, unauthorized: false as const };
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("shop_follows")
    .delete()
    .eq("profile_id", profileId)
    .eq("shop_id", shop.id);

  if (error) {
    throw new Error(error.message);
  }

  notifyShopFollowsChanged({
    shopId: shop.id,
    shopSlug,
    isFollowing: false,
  });

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

  if (followsError || !followRows) {
    throw new Error(followsError?.message ?? "No se pudieron cargar los seguidos.");
  }

  const shopIds = (followRows as FollowRow[]).map((row) => row.shop_id);
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
