import { NextResponse } from "next/server";

import {
  createCheckoutOrder,
  clearPurchasedCartItems,
  prepareCheckoutOrder,
  type CheckoutBuyerInput,
  type CheckoutFulfillmentInput,
  type CheckoutPolicyAcceptanceInput,
  uploadAthReceipt,
} from "@/lib/orders/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { sendBuyerOrderConfirmationEmail, sendVendorNewOrderEmail } from "@/lib/email/resend";
import { checkRateLimit } from "@/lib/rate-limit";

type AthMovilCheckoutPayload = {
  shopSlug?: string;
  buyer?: CheckoutBuyerInput;
  fulfillment?: CheckoutFulfillmentInput;
  policyAcceptance?: CheckoutPolicyAcceptanceInput;
  receiptNote?: string | null;
};

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const rateCheck = checkRateLimit(request, "checkout:ath-movil", {
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

  const formData = await request.formData();
  const payloadValue = getStringValue(formData, "payload");
  const receiptNote = getStringValue(formData, "receiptNote");
  const receipt = formData.get("receipt");

  if (!payloadValue) {
    return NextResponse.json({ error: "Falta la información del checkout." }, { status: 400 });
  }

  if (!(receipt instanceof File)) {
    return NextResponse.json({ error: "Debes subir el recibo de ATH Móvil." }, { status: 400 });
  }

  let payload: AthMovilCheckoutPayload;
  try {
    payload = JSON.parse(payloadValue) as AthMovilCheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Información de checkout inválida." }, { status: 400 });
  }

  const shopSlug = typeof payload.shopSlug === "string" ? payload.shopSlug.trim() : "";
  if (!shopSlug || !payload.fulfillment || !payload.policyAcceptance) {
    return NextResponse.json({ error: "Faltan datos para completar la orden." }, { status: 400 });
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
      paymentMethod: "ath_movil",
      fulfillment: payload.fulfillment,
      buyerInput: payload.buyer ?? {},
      policyAcceptance: payload.policyAcceptance,
    });

    const uploadedReceipt = await uploadAthReceipt(admin, user.id, receipt);
    const createdOrder = await createCheckoutOrder({
      admin,
      preparedOrder,
      paymentStatus: "awaiting_vendor_verification",
      receipt: {
        bucket: uploadedReceipt.bucket,
        path: uploadedReceipt.path,
        note:
          typeof receiptNote === "string" && receiptNote.trim().length > 0
            ? receiptNote.trim()
            : null,
      },
    });

    await clearPurchasedCartItems(admin, user.id, createdOrder.orderId);

    const emailItems = createdOrder.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPriceUsd: item.unitPriceUsd,
    }));

    if (createdOrder.shop.ath_movil_phone) {
      if (createdOrder.shop.supportsAthMovil) {
        const { data: vendorData } = await admin
          .from("profiles")
          .select("email")
          .eq("id", createdOrder.shop.vendor_profile_id)
          .maybeSingle<{ email: string | null }>();

        if (vendorData?.email) {
          void sendVendorNewOrderEmail({
            to: vendorData.email,
            vendorName: createdOrder.shop.vendor_name,
            orderId: createdOrder.orderId,
            buyerEmail: createdOrder.buyer.email,
            buyerName: createdOrder.buyer.fullName,
            items: emailItems,
            totalUsd: createdOrder.totalUsd,
            paymentMethod: "ath_movil",
            athMovilPhone: createdOrder.shop.ath_movil_phone,
          });
        }

        if (createdOrder.buyer.email) {
          void sendBuyerOrderConfirmationEmail({
            to: createdOrder.buyer.email,
            buyerName: createdOrder.buyer.fullName,
            orderId: createdOrder.orderId,
            shopName: createdOrder.shop.vendor_name,
            items: emailItems,
            totalUsd: createdOrder.totalUsd,
            paymentMethod: "ath_movil",
            athMovilPhone: createdOrder.shop.ath_movil_phone,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: createdOrder.orderId,
      paymentStatus: "awaiting_vendor_verification",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo completar la orden.",
      },
      { status: 400 },
    );
  }
}
