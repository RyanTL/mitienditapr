import { NextResponse } from "next/server";

import {
  badRequestResponse,
  forbiddenResponse,
  parseJsonBody,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getVendorRequestContext } from "@/lib/supabase/vendor-server";

type UpdateVendorAccessCodePayload = {
  label?: string;
  isActive?: boolean;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
};

function parsePositiveIntegerOrNull(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }

  return undefined;
}

async function requireAdmin() {
  const context = await getVendorRequestContext();
  if (!context) {
    return { context: null, error: unauthorizedResponse() };
  }

  if (context.profile.role !== "admin") {
    return { context: null, error: forbiddenResponse("Solo administradores.") };
  }

  return { context, error: null };
}

type RouteParams = {
  params: Promise<{ codeId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const { codeId } = await params;
  if (!codeId || codeId.trim().length === 0) {
    return badRequestResponse("Código inválido.");
  }

  const body = await parseJsonBody<UpdateVendorAccessCodePayload>(request);
  if (!body) {
    return badRequestResponse("Body invalido.");
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string") {
    patch.label = body.label.trim();
  }
  if (typeof body.isActive === "boolean") {
    patch.is_active = body.isActive;
  }
  if ("maxRedemptions" in body) {
    const parsed = parsePositiveIntegerOrNull(body.maxRedemptions);
    if (parsed === undefined) {
      return badRequestResponse("maxRedemptions debe ser null o entero positivo.");
    }
    patch.max_redemptions = parsed;
  }
  if ("expiresAt" in body) {
    if (body.expiresAt === null || body.expiresAt === "") {
      patch.expires_at = null;
    } else if (typeof body.expiresAt === "string") {
      patch.expires_at = new Date(body.expiresAt).toISOString();
    } else {
      return badRequestResponse("expiresAt invalido.");
    }
  }

  if (Object.keys(patch).length === 0) {
    return badRequestResponse("No hay cambios para aplicar.");
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("vendor_access_codes")
      .update(patch)
      .eq("id", codeId)
      .select(
        "id,label,is_active,max_redemptions,redeemed_count,benefit_type,benefit_months,expires_at,created_at,updated_at",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return badRequestResponse("Código no encontrado.");
    }

    return NextResponse.json({
      code: {
        id: data.id,
        label: data.label,
        isActive: data.is_active,
        maxRedemptions: data.max_redemptions,
        redeemedCount: data.redeemed_count,
        benefitType: data.benefit_type,
        benefitMonths: data.benefit_months,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo actualizar el código.");
  }
}
