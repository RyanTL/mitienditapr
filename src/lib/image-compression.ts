"use client";

type CompressOptions = {
  maxSizeBytes?: number;
  maxDimension?: number;
};

const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 1600;
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4, 0.25];

const PASSTHROUGH_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

function renameToJpg(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem || "image"}.jpg`;
}

function computeScaledSize(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = Math.min(maxDim / width, maxDim / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function drawViaCreateImageBitmap(
  file: File,
  maxDim: number,
): Promise<HTMLCanvasElement | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const { width, height } = computeScaledSize(
    bitmap.width,
    bitmap.height,
    maxDim,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  try {
    ctx.drawImage(bitmap, 0, 0, width, height);
  } finally {
    bitmap.close?.();
  }
  return canvas;
}

async function drawViaImageElement(
  file: File,
  maxDim: number,
): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () =>
        reject(
          new Error(
            "No pudimos procesar esta imagen. Intenta con otra foto (JPG, PNG o WebP).",
          ),
        );
      i.src = url;
    });
    if (img.width === 0 || img.height === 0) {
      throw new Error("La imagen no tiene dimensiones válidas.");
    }
    const { width, height } = computeScaledSize(img.width, img.height, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Tu navegador no soporta la compresión de imágenes.");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImageForUpload(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION;

  if (file.size <= maxSize && PASSTHROUGH_MIME.has(file.type)) {
    return file;
  }

  const canvas =
    (await drawViaCreateImageBitmap(file, maxDim)) ??
    (await drawViaImageElement(file, maxDim));

  const targetName = renameToJpg(file.name || "image.jpg");

  let lastBlob: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!blob) continue;
    lastBlob = blob;
    if (blob.size <= maxSize) {
      return new File([blob], targetName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }

  if (!lastBlob) {
    throw new Error(
      "No se pudo comprimir la imagen. Intenta con una foto más pequeña.",
    );
  }

  return new File([lastBlob], targetName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
