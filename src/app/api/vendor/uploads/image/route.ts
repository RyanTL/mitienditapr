import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/vendor/api";
import { isVendorModeEnabled } from "@/lib/vendor/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureVendorRole, getVendorRequestContext } from "@/lib/supabase/vendor-server";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_BUCKET = "vendor-images";

function sanitizeFileName(input: string) {
  const trimmed = input.trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9._-]+/g, "-");
  return normalized.length > 0 ? normalized : `upload-${randomUUID()}.jpg`;
}

async function ensurePublicBucket(
  admin: SupabaseClient,
  bucketName: string,
) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const existing = buckets?.find((bucket) => bucket.name === bucketName);
  if (existing) {
    return;
  }

  const { error: createError } = await admin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: `${MAX_FILE_SIZE_BYTES}`,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
}

export async function POST(request: Request) {
  if (!isVendorModeEnabled) {
    return badRequestResponse("Vendor mode is disabled.");
  }

  const context = await getVendorRequestContext();
  if (!context) {
    return unauthorizedResponse();
  }

  let admin: SupabaseClient;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return serverErrorResponse(error, "Configura SUPABASE_SECRET_KEY para subir imagenes.");
  }

  try {
    const profile = await ensureVendorRole(admin, context.profile);
    const formData = await request.formData();
    const maybeFile = formData.get("file");

    if (!(maybeFile instanceof File)) {
      return badRequestResponse("Debes seleccionar una imagen.");
    }

    if (!maybeFile.type.startsWith("image/")) {
      return badRequestResponse("Solo se permiten imagenes.");
    }

    if (maybeFile.size <= 0 || maybeFile.size > MAX_FILE_SIZE_BYTES) {
      return badRequestResponse("La imagen debe pesar menos de 5MB.");
    }

    const bucketName = process.env.SUPABASE_VENDOR_IMAGES_BUCKET ?? DEFAULT_BUCKET;
    await ensurePublicBucket(admin, bucketName);

    const safeFileName = sanitizeFileName(maybeFile.name);
    const objectPath = `${profile.id}/${Date.now()}-${randomUUID()}-${safeFileName}`;
    const fileBuffer = Buffer.from(await maybeFile.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(objectPath, fileBuffer, {
        contentType: maybeFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = admin.storage
      .from(bucketName)
      .getPublicUrl(objectPath);

    if (!publicUrlData.publicUrl) {
      throw new Error("No se pudo generar URL publica.");
    }

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      path: objectPath,
      bucket: bucketName,
    });
  } catch (error) {
    return serverErrorResponse(error, "No se pudo subir la imagen.");
  }
}
