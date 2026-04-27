import { NextResponse } from "next/server";

import {
  createCheckoutOrder,
  prepareCheckoutOrder,
  releaseOrderInventory,
  updateOrderPaymentState,
  type CheckoutBuyerInput,
  type CheckoutFulfillmentInput,
  type CheckoutPolicyAcceptanceInput,
} from "@/lib/orders/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isStripeConnectAccountId } from "@/lib/stripe-connect";
import { createStripeOneTimeCheckoutSession } from "@/lib/vendor/stripe";
import { getAppBaseUrl } from "@/lib/vendor/urls";

type StripeCheckoutPayload = {
  shopSlug?: string;
  buyer?: CheckoutBuyerInput;
  fulfillment?: CheckoutFulfillmentInput;
  policyAcceptance?: CheckoutPolicyAcceptanceInput;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const rateCheck = checkRateLimit(request, "checkout:stripe", {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    identifier: user.id,
  });

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      { status: 429 },
    );
  }

  let payload: StripeCheckoutPayload;
  try {
    payload = (await request.json()) as StripeCheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const shopSlug = typeof payload.shopSlug === "string" ? payload.shopSlug.trim() : "";
  if (!shopSlug || !payload.fulfillment || !payload.policyAcceptance) {
    return NextResponse.json({ error: "Faltan datos para continuar al pago." }, { status: 400 });
  }

  let admin = supabase;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    // Development fallback.
  }

  try {
    const preparedOrder = await prepareCheckoutOrder({
      admin,
      buyerProfileId: user.id,
      shopSlug,
      paymentMethod: "stripe",
      fulfillment: payload.fulfillment,
      buyerInput: payload.buyer ?? {},
      policyAcceptance: payload.policyAcceptance,
    });

    if (!isStripeConnectAccountId(preparedOrder.shop.stripe_connect_account_id)) {
      return NextResponse.json(
        { error: "Esta tienda todavía no acepta pagos con tarjeta." },
        { status: 400 },
      );
    }

    const createdOrder = await createCheckoutOrder({
      admin,
      preparedOrder,
      paymentStatus: "requires_payment",
      receipt: null,
    });

    try {
      const baseUrl = getAppBaseUrl({ requestOrigin: new URL(request.url).origin });
      const lineItems = createdOrder.items.map((item) => ({
        name: item.productName,
        unitAmountCents: Math.round(item.unitPriceUsd * 100),
        quantity: item.quantity,
      }));

      if (createdOrder.shippingFeeUsd > 0) {
        lineItems.push({
          name: "Envío",
          unitAmountCents: Math.round(createdOrder.shippingFeeUsd * 100),
          quantity: 1,
        });
      }

      if (createdOrder.taxUsd > 0) {
        lineItems.push({
          name: "IVU (11.5%) — Puerto Rico",
          unitAmountCents: Math.round(createdOrder.taxUsd * 100),
          quantity: 1,
        });
      }

      const session = await createStripeOneTimeCheckoutSession({
        successUrl: `${baseUrl}/ordenes?checkout=stripe&orderId=${createdOrder.orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/carrito?checkout=stripe-cancelled&orderId=${createdOrder.orderId}`,
        customerEmail: createdOrder.buyer.email,
        clientReferenceId: createdOrder.orderId,
        destinationAccountId: preparedOrder.shop.stripe_connect_account_id,
        metadata: {
          kind: "buyer_order",
          order_id: createdOrder.orderId,
          shop_id: preparedOrder.shop.id,
          buyer_profile_id: user.id,
        },
        paymentIntentMetadata: {
          kind: "buyer_order",
          order_id: createdOrder.orderId,
          shop_id: preparedOrder.shop.id,
          buyer_profile_id: user.id,
        },
        lineItems,
      });

      await updateOrderPaymentState({
        admin,
        orderId: createdOrder.orderId,
        paymentStatus: "requires_payment",
        checkoutSessionId: session.id,
      });

      if (!session.url) {
        throw new Error("Stripe no devolvió una URL de checkout.");
      }

      return NextResponse.json({
        ok: true,
        orderId: createdOrder.orderId,
        url: session.url,
      });
    } catch (error) {
      await releaseOrderInventory(admin, createdOrder.orderId);
      await admin.from("orders").delete().eq("id", createdOrder.orderId);

      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo abrir Stripe Checkout.",
      },
      { status: 400 },
    );
  }
}
