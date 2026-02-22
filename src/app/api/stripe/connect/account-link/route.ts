import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  createStripeExpressAccount,
  createStripeExpressAccountLink,
} from "@/lib/vendor/stripe";
import { getAppBaseUrl } from "@/lib/vendor/urls";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

export async function POST(request: Request) {
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

  try {
    const profile = await ensureVendorRole(dataClient, context.profile);
    const shop = await ensureVendorShopForProfile(dataClient, profile);
    const requestOrigin = new URL(request.url).origin;
    const baseUrl = getAppBaseUrl({ requestOrigin });

    if (isVendorBillingBypassEnabled) {
      const fallbackConnectAccountId =
        shop.stripe_connect_account_id ?? `dev_connect_${profile.id.slice(0, 8)}`;
      const { error: updateShopError } = await dataClient
        .from("shops")
        .update({ stripe_connect_account_id: fallbackConnectAccountId })
        .eq("id", shop.id)
        .eq("vendor_profile_id", profile.id);

      if (updateShopError) {
        throw new Error(updateShopError.message);
      }

      return NextResponse.json({
        url: `${baseUrl}/vendedor/onboarding?step=5&connect=done`,
        stripeConnectAccountId: fallbackConnectAccountId,
      });
    }

    let connectAccountId = shop.stripe_connect_account_id;
    if (!connectAccountId) {
      const account = await createStripeExpressAccount(profile.email ?? "");
      connectAccountId = account.id;

      const { error: updateShopError } = await dataClient
        .from("shops")
        .update({ stripe_connect_account_id: connectAccountId })
        .eq("id", shop.id)
        .eq("vendor_profile_id", profile.id);

      if (updateShopError) {
        throw new Error(updateShopError.message);
      }
    }

    const accountLink = await createStripeExpressAccountLink({
      accountId: connectAccountId,
      refreshUrl: `${baseUrl}/vendedor/onboarding?step=5`,
      returnUrl: `${baseUrl}/vendedor/onboarding?step=5&connect=done`,
    });

    return NextResponse.json({
      url: accountLink.url,
      stripeConnectAccountId: connectAccountId,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo iniciar Stripe Connect.");
  }
}
