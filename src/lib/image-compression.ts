"use client";

type CompressOptions = {
  maxSizeBytes?: number;
  maxDimension?: number;
};

const DEFAULT_MAX_SIZE_BYTES = 3.5 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2000;
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];

const PASSTHROUGH_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "No pudimos procesar esta imagen. Intenta con otra foto (JPG, PNG o WebP).",
        ),
      );
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function renameToJpg(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem || "image"}.jpg`;
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

  const img = await loadImageFromBlob(file);

  let { width, height } = img;
  if (width === 0 || height === 0) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }

  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tu navegador no soporta la compresión de imágenes.");
  }
  ctx.drawImage(img, 0, 0, width, height);

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
    throw new Error("No se pudo comprimir la imagen.");
  }

  return new File([lastBlob], targetName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
