import { createHash } from "crypto";
import { NextResponse } from "next/server";

import {
  badRequestResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getVendorRequestContext, getVendorShopByProfileId } from "@/lib/supabase/vendor-server";
import {
  DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
  POLICY_TYPE_LABELS,
} from "@/lib/policies/constants";
import type { PolicyType } from "@/lib/policies/types";
import { validatePolicyBody } from "@/lib/policies/validation";
import {
  buildVendorPolicyCompletion,
  createVendorPolicyAcceptance,
  getCurrentShopPolicyVersions,
  getLatestVendorPolicyAcceptance,
  getRequiredPolicyIds,
  isPolicyType,
  publishShopPolicyVersion,
} from "@/lib/supabase/vendor-policy-server";

type PublishPolicyPayload = {
  title?: string;
  body?: string;
  templateId?: string | null;
  acceptanceScope?: "publish" | "update";
  acceptanceText?: string;
  accepted?: boolean;
};

function getClientIpHash(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "";
  if (!ip) {
    return null;
  }

  return createHash("sha256").update(ip).digest("hex");
}

type RouteParams = {
  params: Promise<{ policyType: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  const { policyType: rawPolicyType } = await params;
  if (!isPolicyType(rawPolicyType)) {
    return badRequestResponse("Tipo de política inválido.");
  }
  const policyType: PolicyType = rawPolicyType;

  const body = await parseJsonBody<PublishPolicyPayload>(request);
  if (!body || typeof body.body !== "string") {
    return badRequestResponse("Debes incluir el texto de la política.");
  }

  if (body.accepted !== true) {
    return badRequestResponse("Debes confirmar la aceptación legal antes de publicar.");
  }

  const normalizedTitle =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : POLICY_TYPE_LABELS[policyType];

  const validatedBody = validatePolicyBody(policyType, body.body);
  if (!validatedBody.ok) {
    return badRequestResponse(validatedBody.error);
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  try {
    const shop = await getVendorShopByProfileId(dataClient, context.userId);
    if (!shop) {
      return badRequestResponse("Debes crear tu tienda primero.");
    }

    const publishedVersion = await publishShopPolicyVersion({
      supabase: dataClient,
      shopId: shop.id,
      policyType,
      title: normalizedTitle,
      body: validatedBody.value,
      sourceTemplateId:
        typeof body.templateId === "string" && body.templateId.trim().length > 0
          ? body.templateId.trim()
          : null,
      publishedBy: context.userId,
    });

    const currentPolicies = await getCurrentShopPolicyVersions(dataClient, shop.id);
    const requiredIds = getRequiredPolicyIds(currentPolicies);
    let latestAcceptance = await getLatestVendorPolicyAcceptance(dataClient, shop.id);

    if (requiredIds) {
      latestAcceptance = await createVendorPolicyAcceptance({
        supabase: dataClient,
        shopId: shop.id,
        acceptedByProfileId: context.userId,
        acceptanceScope: body.acceptanceScope ?? "update",
        termsVersionId: requiredIds.terms,
        shippingVersionId: requiredIds.shipping,
        refundVersionId: currentPolicies.refund?.id ?? null,
        privacyVersionId: currentPolicies.privacy?.id ?? null,
        ipHash: getClientIpHash(request),
        userAgent: request.headers.get("user-agent"),
        acceptanceText:
          typeof body.acceptanceText === "string" && body.acceptanceText.trim().length > 0
            ? body.acceptanceText.trim()
            : DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT,
      });
    }

    return NextResponse.json({
      locale: "es-PR",
      currentPolicies,
      completion: buildVendorPolicyCompletion(currentPolicies),
      latestAcceptance,
      publishedPolicy: publishedVersion,
      acceptancePending: !requiredIds,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo publicar la política.");
  }
}
