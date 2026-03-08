import { NextResponse } from "next/server";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getVendorRequestContext } from "@/lib/supabase/vendor-server";
import type { PolicyTemplate, PolicyType } from "@/lib/policies/types";

type PolicyTemplateRow = {
  id: string;
  policy_type: PolicyType;
  locale: string;
  title: string;
  body_template: string;
  version: number;
};

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

  try {
    const { data, error } = await dataClient
      .from("policy_templates")
      .select("id,policy_type,locale,title,body_template,version")
      .eq("is_active", true)
      .eq("locale", "es-PR")
      .order("policy_type", { ascending: true })
      .order("version", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const templates = ((data as PolicyTemplateRow[] | null) ?? []).map((row) => ({
      id: row.id,
      policyType: row.policy_type,
      locale: row.locale,
      title: row.title,
      bodyTemplate: row.body_template,
      version: row.version,
    })) satisfies PolicyTemplate[];

    return NextResponse.json({ templates });
  } catch (error) {
    return serverErrorResponse(error, "No se pudieron cargar las plantillas.");
  }
}
