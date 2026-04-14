import { NextResponse } from "next/server";

import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import {
  activateVendorStripeSubscription,
  isActiveVendorSubscriptionStatus,
  normalizeStripeSubscriptionStatus,
} from "@/lib/vendor/subscription-activation";
import {
  readStripeCheckoutSession,
  readStripeSubscription,
} from "@/lib/vendor/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
} from "@/lib/supabase/vendor-server";

type VerifySubscriptionPayload = {
  sessionId?: string;
};

type VerifySubscriptionResponse = {
  status: "active" | "pending" | "invalid";
  message?: string;
  redirectTo?: string;
};

const PANEL_REDIRECT = "/vendedor/panel?welcome=vendor-activated";

function pendingResponse(message: string, redirectTo = "/vendedor/activacion") {
  return NextResponse.json<VerifySubscriptionResponse>({
    status: "pending",
    message,
    redirectTo,
  });
}

function invalidResponse(message: string) {
  return NextResponse.json<VerifySubscriptionResponse>({
    status: "invalid",
    message,
    redirectTo: "/vendedor/onboarding",
  });
}

export async function POST(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const body = await parseJsonBody<VerifySubscriptionPayload>(request);
  const sessionId = body?.sessionId?.trim();
  if (!sessionId) {
    return badRequestResponse("Debes indicar el session_id del checkout.");
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
    const session = await readStripeCheckoutSession(sessionId);

    if (session.metadata?.shop_id !== shop.id || session.metadata?.vendor_profile_id !== profile.id) {
      return invalidResponse("Esta sesión de pago no corresponde a tu tienda.");
    }

    if (session.status !== "complete") {
      return pendingResponse("Estamos confirmando tu pago con Stripe.");
    }

    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;
    const customerId = typeof session.customer === "string" ? session.customer : null;

    if (!subscriptionId) {
      return pendingResponse("Estamos terminando de activar tu cuenta.");
    }

    const subscription = await readStripeSubscription(subscriptionId);
    const normalizedStatus = normalizeStripeSubscriptionStatus(subscription.status);

    await activateVendorStripeSubscription({
      supabase: dataClient,
      shopId: shop.id,
      profileId: profile.id,
      customerId,
      subscriptionId,
      status: normalizedStatus,
      priceId: subscription.items?.data?.[0]?.price?.id ?? null,
      currentPeriodEnd:
        typeof subscription.current_period_end === "number"
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      checkoutSessionId: session.id,
      lastInvoiceStatus:
        session.payment_status === "paid" || normalizedStatus === "trialing"
          ? "paid"
          : session.payment_status ?? null,
    });

    if (!isActiveVendorSubscriptionStatus(normalizedStatus)) {
      return pendingResponse("Tu pago fue recibido. Estamos terminando de activar tu cuenta.");
    }

    return NextResponse.json<VerifySubscriptionResponse>({
      status: "active",
      redirectTo: PANEL_REDIRECT,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo verificar el pago.";
    if (/No such checkout\.session/i.test(message)) {
      return invalidResponse("No encontramos esa sesión de pago.");
    }
    if (/No such subscription/i.test(message)) {
      return pendingResponse("Tu pago fue recibido. Estamos esperando la confirmación final.");
    }
    return serverErrorResponse(error, "No se pudo verificar el pago.");
  }
}
