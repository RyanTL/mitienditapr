import crypto from "node:crypto";

type StripeRecord = Record<string, string | number | boolean | undefined | null>;

export type StripeSubscriptionEventObject = {
  id: string;
  status?: string;
  customer?: string;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

export type StripeInvoiceEventObject = {
  id: string;
  status?: string;
  customer?: string;
  subscription?: string;
};

export type StripeWebhookEvent<TData = unknown> = {
  id: string;
  type: string;
  data: {
    object: TData;
  };
};

function readStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  return value;
}

export function readVendorPriceId() {
  const value = process.env.STRIPE_VENDOR_PRICE_ID;
  if (!value) {
    throw new Error("Missing STRIPE_VENDOR_PRICE_ID.");
  }
  return value;
}

export function readStripeWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }
  return value;
}

function toUrlEncodedBody(input: StripeRecord) {
  const body = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    body.set(key, String(value));
  });
  return body;
}

async function stripeRequest<TResponse>(
  path: string,
  params: StripeRecord,
): Promise<TResponse> {
  const secretKey = readStripeSecretKey();
  const body = toUrlEncodedBody(params);

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as
    | (TResponse & { error?: { message?: string } })
    | null;

  if (!response.ok || !json) {
    const fallbackMessage = `Stripe request failed (${response.status}).`;
    throw new Error(json?.error?.message ?? fallbackMessage);
  }

  return json;
}

type StripeExpressAccountResponse = {
  id: string;
};

export async function createStripeExpressAccount(email: string) {
  return stripeRequest<StripeExpressAccountResponse>("/accounts", {
    type: "express",
    email,
    capabilities: undefined,
  });
}

type StripeAccountLinkResponse = {
  url: string;
};

export async function createStripeExpressAccountLink(input: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  return stripeRequest<StripeAccountLinkResponse>("/account_links", {
    account: input.accountId,
    type: "account_onboarding",
    refresh_url: input.refreshUrl,
    return_url: input.returnUrl,
  });
}

type StripeCustomerResponse = {
  id: string;
};

export async function createStripeCustomer(input: {
  email: string | null;
  name: string | null;
}) {
  return stripeRequest<StripeCustomerResponse>("/customers", {
    email: input.email,
    name: input.name,
  });
}

type StripeCheckoutSessionResponse = {
  id: string;
  url: string | null;
};

export async function createStripeSubscriptionCheckoutSession(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const metadataEntries = Object.entries(input.metadata ?? {});
  const metadataParams = metadataEntries.reduce<StripeRecord>((acc, [key, value]) => {
    acc[`metadata[${key}]`] = value;
    return acc;
  }, {});

  return stripeRequest<StripeCheckoutSessionResponse>("/checkout/sessions", {
    mode: "subscription",
    customer: input.customerId,
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": 1,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    ...metadataParams,
  });
}

export function verifyStripeWebhookSignature(input: {
  rawBody: string;
  stripeSignatureHeader: string | null;
  webhookSecret: string;
}) {
  const { rawBody, stripeSignatureHeader, webhookSecret } = input;

  if (!stripeSignatureHeader) {
    return false;
  }

  const signatureParts = stripeSignatureHeader.split(",").reduce<Record<string, string>>(
    (acc, item) => {
      const [key, value] = item.split("=");
      if (!key || !value) {
        return acc;
      }
      acc[key.trim()] = value.trim();
      return acc;
    },
    {},
  );

  const timestamp = signatureParts.t;
  const v1Signature = signatureParts.v1;
  if (!timestamp || !v1Signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(v1Signature, "hex");
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
