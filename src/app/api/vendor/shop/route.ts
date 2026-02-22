import { NextResponse } from "next/server";

import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { slugifyShopName } from "@/lib/vendor/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getShopPoliciesByShopId,
  getVendorPublishChecks,
  getVendorRequestContext,
  getVendorShopByProfileId,
  getVendorSubscriptionByShopId,
} from "@/lib/supabase/vendor-server";
import type { VendorShopStatus } from "@/lib/vendor/constants";

type ShopPatchPayload = {
  vendorName?: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
  shippingFlatFeeUsd?: number;
  offersPickup?: boolean;
  status?: VendorShopStatus;
  policies?: {
    refundPolicy?: string;
    shippingPolicy?: string;
    privacyPolicy?: string;
    terms?: string;
  };
};

const MUTABLE_STATUSES = new Set<VendorShopStatus>(["paused", "active"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value : null;
}

function getNumber(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getBoolean(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "boolean" ? value : null;
}

export async function GET() {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  const shop = await getVendorShopByProfileId(dataClient, context.userId);
  if (!shop) {
    return NextResponse.json({
      shop: null,
      policies: null,
      subscription: null,
      checks: {
        canPublish: false,
        blockingReasons: ["Debes crear tu tienda."],
      },
    });
  }

  const [policies, subscription, checks] = await Promise.all([
    getShopPoliciesByShopId(dataClient, shop.id),
    getVendorSubscriptionByShopId(dataClient, shop.id),
    getVendorPublishChecks(dataClient, context.userId),
  ]);

  return NextResponse.json({
    shop,
    policies,
    subscription,
    checks,
  });
}

export async function PATCH(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const body = await parseJsonBody<ShopPatchPayload>(request);
  if (!body || !isRecord(body)) {
    return badRequestResponse("Cuerpo invalido.");
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);

    const updates: Record<string, unknown> = {};

    const vendorName = getString(body, "vendorName");
    if (vendorName !== null) {
      updates.vendor_name = vendorName.trim();
    }

    const slugInput = getString(body, "slug");
    if (slugInput !== null) {
      const normalizedSlug = slugifyShopName(slugInput);
      if (!normalizedSlug) {
        return badRequestResponse("Slug invalido.");
      }
      updates.slug = normalizedSlug;
    }

    const description = getString(body, "description");
    if (description !== null) {
      updates.description = description.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "logoUrl")) {
      const logoUrl = body.logoUrl;
      updates.logo_url =
        typeof logoUrl === "string" && logoUrl.trim().length > 0 ? logoUrl.trim() : null;
    }

    const shippingFlatFeeUsd = getNumber(body, "shippingFlatFeeUsd");
    if (shippingFlatFeeUsd !== null) {
      updates.shipping_flat_fee_usd = Math.max(0, shippingFlatFeeUsd);
    }

    const offersPickup = getBoolean(body, "offersPickup");
    if (offersPickup !== null) {
      updates.offers_pickup = offersPickup;
    }

    if (typeof body.status === "string") {
      if (!MUTABLE_STATUSES.has(body.status)) {
        return badRequestResponse("Estado de tienda invalido.");
      }

      if (body.status === "active") {
        const checks = await getVendorPublishChecks(dataClient, profile.id);
        if (!checks.canPublish) {
          return NextResponse.json(
            {
              error: "No puedes activar la tienda aun.",
              blockingReasons: checks.blockingReasons,
            },
            { status: 400 },
          );
        }
        updates.status = "active";
        updates.is_active = true;
        updates.unpublished_at = null;
        updates.unpublished_reason = null;
      } else {
        updates.status = body.status;
        updates.is_active = false;
        updates.unpublished_at = new Date().toISOString();
        updates.unpublished_reason = "paused_by_vendor";
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: shopError } = await dataClient
        .from("shops")
        .update(updates)
        .eq("id", shop.id)
        .eq("vendor_profile_id", profile.id);

      if (shopError) {
        if (shopError.code === "23505") {
          return badRequestResponse("Ese slug ya esta en uso.");
        }
        throw new Error(shopError.message);
      }
    }

    if (body.policies && isRecord(body.policies)) {
      const currentPolicies = await getShopPoliciesByShopId(dataClient, shop.id);

      const { error: policiesError } = await dataClient.from("shop_policies").upsert(
        {
          shop_id: shop.id,
          refund_policy:
            typeof body.policies.refundPolicy === "string"
              ? body.policies.refundPolicy
              : (currentPolicies?.refund_policy ?? ""),
          shipping_policy:
            typeof body.policies.shippingPolicy === "string"
              ? body.policies.shippingPolicy
              : (currentPolicies?.shipping_policy ?? ""),
          privacy_policy:
            typeof body.policies.privacyPolicy === "string"
              ? body.policies.privacyPolicy
              : (currentPolicies?.privacy_policy ?? ""),
          terms:
            typeof body.policies.terms === "string"
              ? body.policies.terms
              : (currentPolicies?.terms ?? ""),
        },
        { onConflict: "shop_id" },
      );

      if (policiesError) {
        throw new Error(policiesError.message);
      }
    }

    const nextShop = await getVendorShopByProfileId(dataClient, profile.id);
    const nextPolicies = nextShop
      ? await getShopPoliciesByShopId(dataClient, nextShop.id)
      : null;
    const checks = await getVendorPublishChecks(dataClient, profile.id);

    return NextResponse.json({
      shop: nextShop,
      policies: nextPolicies,
      checks,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo guardar la tienda.");
  }
}
