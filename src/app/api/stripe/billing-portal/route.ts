import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import {
  badRequestResponse,
  serverErrorResponse,
  tooManyRequestsResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorBillingBypassEnabled } from "@/lib/vendor/billing-mode";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createStripeBillingPortalSession } from "@/lib/vendor/stripe";
import { getAppBaseUrl } from "@/lib/vendor/urls";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureVendorRole,
  ensureVendorShopForProfile,
  getVendorRequestContext,
  getVendorSubscriptionByShopId,
} from "@/lib/supabase/vendor-server";

export async function POST(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const { allowed } = checkRateLimit(request, "stripe:billing-portal", {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    identifier: context.userId,
  });
  if (!allowed) {
    return tooManyRequestsResponse();
  }

  if (isVendorBillingBypassEnabled) {
    return badRequestResponse(
      "El portal de facturación no está disponible en modo prueba (facturación omitida).",
    );
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
    const subscription = await getVendorSubscriptionByShopId(dataClient, shop.id);

    if (!subscription || subscription.provider !== "stripe") {
      return badRequestResponse(
        "No tienes una suscripción de pago con tarjeta asociada a esta tienda.",
      );
    }

    const customerId = subscription.stripe_customer_id?.trim() ?? "";
    if (!customerId || !customerId.startsWith("cus_")) {
      return badRequestResponse(
        "No encontramos tu cliente de Stripe. Suscríbete primero o contacta soporte.",
      );
    }

    const requestOrigin = new URL(request.url).origin;
    const baseUrl = getAppBaseUrl({ requestOrigin });
    const returnUrl = `${baseUrl}/vendedor/tienda`;

    const session = await createStripeBillingPortalSession({
      customerId,
      returnUrl,
    });

    if (!session.url) {
      return serverErrorResponse(
        new Error("Stripe no devolvió URL del portal."),
        "No se pudo abrir el portal de facturación.",
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo abrir el portal de facturación.");
  }
}
