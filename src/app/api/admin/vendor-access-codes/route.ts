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
import {
  createPlainAccessCode,
  hashAccessCode,
  normalizeAccessCode,
  type VendorAccessBenefitType,
} from "@/lib/vendor/access-codes";

type CreateVendorAccessCodePayload = {
  label?: string;
  benefitType?: VendorAccessBenefitType;
  benefitMonths?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
};

function parsePositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

async function requireAdminContext() {
  const context = await getVendorRequestContext();
  if (!context) {
    return { error: unauthorizedResponse(), context: null };
  }

  if (context.profile.role !== "admin") {
    return { error: forbiddenResponse("Solo administradores."), context: null };
  }

  return { error: null, context };
}

export async function GET() {
  const adminCheck = await requireAdminContext();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("vendor_access_codes")
      .select(
        "id,label,is_active,max_redemptions,redeemed_count,benefit_type,benefit_months,expires_at,created_at,updated_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      codes: (data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        isActive: row.is_active,
        maxRedemptions: row.max_redemptions,
        redeemedCount: row.redeemed_count,
        benefitType: row.benefit_type,
        benefitMonths: row.benefit_months,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar los codigos.");
  }
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminContext();
  if (adminCheck.error || !adminCheck.context) {
    return adminCheck.error ?? unauthorizedResponse();
  }

  const body = await parseJsonBody<CreateVendorAccessCodePayload>(request);
  if (!body) {
    return badRequestResponse("Body invalido.");
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return badRequestResponse("El label del codigo es requerido.");
  }

  const benefitType: VendorAccessBenefitType =
    body.benefitType === "lifetime_free" ? "lifetime_free" : "free_months";
  const benefitMonths =
    benefitType === "free_months" ? parsePositiveInteger(body.benefitMonths) ?? 1 : null;
  const maxRedemptions = parsePositiveInteger(body.maxRedemptions);
  const expiresAt =
    typeof body.expiresAt === "string" && body.expiresAt.trim().length > 0
      ? new Date(body.expiresAt).toISOString()
      : null;

  try {
    const admin = createSupabaseAdminClient();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const plainCode = createPlainAccessCode();
      const normalizedCode = normalizeAccessCode(plainCode);
      const codeHash = hashAccessCode(normalizedCode);

      const { data, error } = await admin
        .from("vendor_access_codes")
        .insert({
          code_hash: codeHash,
          label,
          is_active: true,
          max_redemptions: maxRedemptions,
          redeemed_count: 0,
          benefit_type: benefitType,
          benefit_months: benefitMonths,
          expires_at: expiresAt,
          created_by_profile_id: adminCheck.context.userId,
        })
        .select(
          "id,label,is_active,max_redemptions,redeemed_count,benefit_type,benefit_months,expires_at,created_at,updated_at",
        )
        .maybeSingle();

      if (data && !error) {
        return NextResponse.json({
          code: {
            id: data.id,
            label: data.label,
            plainCode,
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
      }

      if (error?.code !== "23505") {
        throw new Error(error?.message ?? "No se pudo crear el codigo.");
      }
    }

    throw new Error("No se pudo generar un codigo unico. Intenta nuevamente.");
  } catch (error) {
    return serverErrorResponse(error, "No se pudo crear el codigo.");
  }
}
