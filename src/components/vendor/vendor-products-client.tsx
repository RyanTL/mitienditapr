"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { AlertIcon, ChevronIcon, PackageIcon } from "@/components/icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  addVendorProductImage,
  createVendorProduct,
  deleteVendorProduct,
  deleteVendorProductImage,
  fetchVendorProducts,
  updateVendorProduct,
  uploadVendorImage,
} from "@/lib/vendor/client";
import { formatUsd } from "@/lib/formatters";
import { toNumber } from "@/lib/utils";

type VendorProduct = Awaited<ReturnType<typeof fetchVendorProducts>>["products"][number];

type SheetState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; product: VendorProduct };

type ProductDraft = {
  name: string;
  description: string;
  priceUsd: string;
  stockQty: string;
  hasStock: boolean;
  isActive: boolean;
};

type PendingProductImage = {
  id: string;
  file: File;
  previewUrl: string;
  alt: string | null;
};

type NewProductImagePayload = {
  imageUrl: string;
  alt: string | null;
};

const DEFAULT_PRODUCT_DRAFT: ProductDraft = {
  name: "",
  description: "",
  priceUsd: "10.00",
  stockQty: "1",
  hasStock: false,
  isActive: true,
};

const MAX_PRODUCT_IMAGES = 6;
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function buildDraftFromProduct(product: VendorProduct): ProductDraft {
  const tracking = product.variants.filter((v) => v.isActive && v.stockQty !== null);
  const totalStock = tracking.reduce((sum, v) => sum + (v.stockQty ?? 0), 0);

  return {
    name: product.name,
    description: product.description ?? "",
    priceUsd: product.priceUsd.toFixed(2),
    stockQty: tracking.length > 0 ? String(totalStock) : "0",
    hasStock: tracking.length > 0,
    isActive: product.isActive,
  };
}

function areDraftsEqual(a: ProductDraft, b: ProductDraft) {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.priceUsd === b.priceUsd &&
    a.stockQty === b.stockQty &&
    a.hasStock === b.hasStock &&
    a.isActive === b.isActive
  );
}

function getNextPendingImageId(index: number) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `pending-image-${Date.now()}-${index}`;
}

function getPreviewImage(product: VendorProduct) {
  return (
    product.images[0]?.imageUrl ||
    product.imageUrl ||
    null
  );
}

function getTotalStock(product: VendorProduct) {
  const tracking = product.variants.filter((v) => v.isActive && v.stockQty !== null);
  if (tracking.length === 0) return null;
  return tracking.reduce((sum, v) => sum + (v.stockQty ?? 0), 0);
}

function StockBadge({ product }: { product: VendorProduct }) {
  const total = getTotalStock(product);
  if (total === null) return <span className="text-xs text-[var(--color-gray-500)]">Sin límite</span>;
  if (total === 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">Sin stock</span>;
  if (total <= 5) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{total} restantes</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">{total} en stock</span>;
}

// Simple toggle component
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-[var(--color-brand)]" : "bg-[var(--color-gray-300,#d1d5db)]",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

// ── Product Sheet (create & edit) ─────────────────────────────────────────────
function ProductSheet({
  sheetState,
  onClose,
  onSaved,
}: {
  sheetState: SheetState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingProductImage[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(DEFAULT_PRODUCT_DRAFT);
  const [images, setImages] = useState<VendorProduct["images"]>([]);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearPendingImages = useCallback(() => {
    setPendingImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }, []);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!sheetState.open) {
      clearPendingImages();
      setImages([]);
      setDraft(DEFAULT_PRODUCT_DRAFT);
      setError(null);
      return;
    }

    if (sheetState.mode === "edit") {
      setDraft(buildDraftFromProduct(sheetState.product));
      setImages(sheetState.product.images);
      clearPendingImages();
    } else {
      setDraft(DEFAULT_PRODUCT_DRAFT);
      setImages([]);
      clearPendingImages();
    }
    setError(null);
  }, [sheetState, clearPendingImages]);

  const handleImageSelection = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length || !sheetState.open) {
      return;
    }

    const selectedFiles = Array.from(fileList);
    const currentImageCount = sheetState.mode === "edit" ? images.length : pendingImages.length;
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - currentImageCount);

    if (remainingSlots === 0) {
      setError(`Puedes agregar hasta ${MAX_PRODUCT_IMAGES} fotos por producto.`);
      return;
    }

    const nextFiles = selectedFiles.slice(0, remainingSlots);
    const validFiles: File[] = [];
    let nextError: string | null =
      selectedFiles.length > remainingSlots
        ? `Puedes agregar hasta ${MAX_PRODUCT_IMAGES} fotos por producto.`
        : null;

    nextFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        nextError = "Solo se permiten imagenes.";
        return;
      }

      if (file.size <= 0 || file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        nextError = "Cada imagen debe pesar menos de 5MB.";
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length === 0) {
      setError(nextError ?? "No se pudieron agregar las imagenes.");
      return;
    }

    setError(nextError);

    if (sheetState.mode === "create") {
      setPendingImages((current) => [
        ...current,
        ...validFiles.map((file, index) => ({
          id: getNextPendingImageId(index),
          file,
          previewUrl: URL.createObjectURL(file),
          alt: null,
        })),
      ]);
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedImages: VendorProduct["images"] = [];
      for (const file of validFiles) {
        const upload = await uploadVendorImage(file);
        const response = await addVendorProductImage(sheetState.product.id, {
          imageUrl: upload.url,
        });
        uploadedImages.push(response.image);
      }

      setImages((current) =>
        [...current, ...uploadedImages].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploadingImage(false);
    }
  }, [sheetState, images.length, pendingImages.length, onSaved]);

  const handleRemovePendingImage = useCallback((imageId: string) => {
    setPendingImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return current.filter((item) => item.id !== imageId);
    });
  }, []);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (sheetState.open && sheetState.mode === "edit") {
      setIsSaving(true);
      try {
        await deleteVendorProductImage(sheetState.product.id, imageId);
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar la imagen.");
      } finally {
        setIsSaving(false);
      }
    }
  }, [sheetState, onSaved]);

  const initialDraft =
    sheetState.open && sheetState.mode === "edit"
      ? buildDraftFromProduct(sheetState.product)
      : DEFAULT_PRODUCT_DRAFT;

  const isDirty =
    sheetState.open &&
    (!areDraftsEqual(draft, initialDraft) ||
      (sheetState.mode === "create" && pendingImages.length > 0));

  const requestClose = useCallback(() => {
    if (!sheetState.open || isSaving || isUploadingImage) {
      return;
    }

    if (isDirty) {
      const shouldDiscard = window.confirm(
        sheetState.mode === "create"
          ? "Descartar este nuevo producto?"
          : "Descartar los cambios de este producto?",
      );

      if (!shouldDiscard) {
        return;
      }
    }

    onClose();
  }, [sheetState, isSaving, isUploadingImage, isDirty, onClose]);

  const handleSave = useCallback(async () => {
    const name = draft.name.trim();
    if (!name) { setError("El nombre es obligatorio."); return; }

    if (sheetState.open && sheetState.mode === "create" && pendingImages.length === 0) {
      setError("Debes agregar al menos una foto.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (sheetState.open && sheetState.mode === "create") {
        const uploadedImages: NewProductImagePayload[] = [];
        if (pendingImages.length > 0) {
          setIsUploadingImage(true);
          for (const image of pendingImages) {
            const upload = await uploadVendorImage(image.file);
            uploadedImages.push({
              imageUrl: upload.url,
              alt: image.alt,
            });
          }
          setIsUploadingImage(false);
        }

        await createVendorProduct({
          name,
          description: draft.description.trim(),
          images: uploadedImages,
          variant: {
            title: "Default",
            priceUsd: Math.max(0, toNumber(draft.priceUsd)),
            stockQty: draft.hasStock ? Math.max(0, Math.trunc(toNumber(draft.stockQty))) : null,
          },
          isActive: draft.isActive,
        });
      } else if (sheetState.open && sheetState.mode === "edit") {
        await updateVendorProduct(sheetState.product.id, {
          name,
          description: draft.description.trim(),
          priceUsd: Math.max(0, toNumber(draft.priceUsd)),
          isActive: draft.isActive,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setIsUploadingImage(false);
      setIsSaving(false);
    }
  }, [draft, sheetState, pendingImages, onSaved, onClose]);

  const handleDelete = useCallback(async () => {
    if (!sheetState.open || sheetState.mode !== "edit") return;
    const ok = window.confirm(`Eliminar "${sheetState.product.name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setIsSaving(true);
    try {
      await deleteVendorProduct(sheetState.product.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar. Puede que tenga órdenes asociadas.");
    } finally {
      setIsSaving(false);
    }
  }, [sheetState, onSaved, onClose]);

  const isEdit = sheetState.open && sheetState.mode === "edit";
  const visibleImageCount = isEdit ? images.length : pendingImages.length;
  const canAddMoreImages = visibleImageCount < MAX_PRODUCT_IMAGES;

  return (
    <Sheet open={sheetState.open} onOpenChange={(open) => { if (!open) requestClose(); }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-0">
        <SheetHeader className="sticky top-0 z-10 border-b border-[var(--color-gray-200,#e5e7eb)] bg-white px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-lg font-bold">
              {isEdit ? "Editar producto" : "Nuevo producto"}
            </SheetTitle>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving || isUploadingImage}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray-200,#e5e7eb)] text-lg font-semibold text-[var(--color-gray-500)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-60"
              aria-label="Cerrar formulario"
            >
              ×
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-32 pt-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                  Fotos
                </p>
                <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                  {isEdit
                    ? "La primera foto funciona como portada del producto."
                    : "Puedes agregar las fotos antes de guardar. La primera sera la portada."}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-gray-100)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-gray-500)]">
                {visibleImageCount}/{MAX_PRODUCT_IMAGES}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {isEdit
                ? images.map((img) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--color-gray-100)]">
                    <Image src={img.imageUrl} alt={img.alt ?? "Producto"} fill className="object-cover" sizes="120px" />
                    <button
                      type="button"
                      onClick={() => void handleDeleteImage(img.id)}
                      disabled={isSaving || isUploadingImage}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                      aria-label="Eliminar imagen"
                    >
                      ×
                    </button>
                  </div>
                ))
                : pendingImages.map((img) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--color-gray-100)]">
                    <Image src={img.previewUrl} alt={img.alt ?? "Vista previa del producto"} fill className="object-cover" sizes="120px" />
                    <button
                      type="button"
                      onClick={() => handleRemovePendingImage(img.id)}
                      disabled={isSaving || isUploadingImage}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                      aria-label="Quitar imagen"
                    >
                      ×
                    </button>
                  </div>
                ))}

              {canAddMoreImages && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage || isSaving}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-gray-300,#d1d5db)] px-3 text-center transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:opacity-60"
                >
                  {isUploadingImage ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
                  ) : (
                    <>
                      <span className="text-2xl leading-none text-[var(--color-gray-400)]">+</span>
                      <span className="mt-1 text-xs font-semibold text-[var(--color-gray-500)]">
                        Agregar foto
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.currentTarget.files;
                e.currentTarget.value = "";
                void handleImageSelection(files);
              }}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
              Nombre *
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ej. Camiseta azul talla M"
              className="mt-1.5 w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] px-3 py-2.5 text-sm font-medium text-[var(--color-carbon)] placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:outline-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
              Precio (USD)
            </label>
            <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] focus-within:border-[var(--color-brand)]">
              <span className="shrink-0 pl-3 text-sm font-semibold text-[var(--color-gray-500)]">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.priceUsd}
                onChange={(e) => setDraft((d) => ({ ...d, priceUsd: e.target.value }))}
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-medium text-[var(--color-carbon)] focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
              Descripción <span className="font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Describe tu producto…"
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] px-3 py-2.5 text-sm text-[var(--color-carbon)] placeholder:text-[var(--color-gray-500)] focus:border-[var(--color-brand)] focus:outline-none"
            />
          </div>

          {/* Stock */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                  Inventario limitado
                </p>
                <p className="text-xs text-[var(--color-gray-500)]">
                  Activa para rastrear unidades disponibles
                </p>
              </div>
              <Toggle
                checked={draft.hasStock}
                onChange={(v) => setDraft((d) => ({ ...d, hasStock: v }))}
              />
            </div>
            {draft.hasStock && (
              <input
                type="number"
                min={0}
                step={1}
                value={draft.stockQty}
                onChange={(e) => setDraft((d) => ({ ...d, stockQty: e.target.value }))}
                placeholder="Cantidad en stock"
                className="mt-2 w-full rounded-xl border border-[var(--color-gray-200,#e5e7eb)] bg-[var(--color-gray-100)] px-3 py-2.5 text-sm font-medium text-[var(--color-carbon)] focus:border-[var(--color-brand)] focus:outline-none"
              />
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gray-500)]">
                Producto activo
              </p>
              <p className="text-xs text-[var(--color-gray-500)]">
                Visible para compradores en tu tienda
              </p>
            </div>
            <Toggle
              checked={draft.isActive}
              onChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Sticky bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 flex gap-2 border-t border-[var(--color-gray-200,#e5e7eb)] bg-white px-5 pt-3" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
          {isEdit && (
            <button
              type="button"
              disabled={isSaving || isUploadingImage}
              onClick={() => void handleDelete()}
              className="rounded-full border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            disabled={isSaving || isUploadingImage}
            onClick={requestClose}
            className="rounded-full border border-[var(--color-gray-300,#d1d5db)] px-4 py-2.5 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving || isUploadingImage}
            onClick={() => void handleSave()}
            className="flex-1 rounded-full bg-[var(--color-brand)] py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isUploadingImage ? "Subiendo fotos…" : isSaving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function VendorProductsClient() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>({ open: false });

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchVendorProducts();
      setProducts(res.products);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudieron cargar productos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const lowStockCount = products.filter((p) => {
    if (!p.isActive) return false;
    const total = getTotalStock(p);
    return total !== null && total <= 5;
  }).length;

  return (
    <VendorPageShell title="Productos">
      {errorMsg && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {!isLoading && lowStockCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {lowStockCount} {lowStockCount === 1 ? "producto con stock bajo" : "productos con stock bajo"}; actualiza tu inventario.
          </p>
        </div>
      )}

      {/* Product list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[var(--color-carbon)] shadow-sm">
            <PackageIcon className="h-9 w-9" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-carbon)]">Sin productos todavía</p>
            <p className="mt-1 text-sm text-[var(--color-gray-500)]">
              Agrega tu primer producto para empezar a vender.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheetState({ open: true, mode: "create" })}
            className="rounded-full bg-[var(--color-brand)] px-6 py-2.5 text-sm font-bold text-white"
          >
            + Agregar producto
          </button>
        </div>
      ) : (
        <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {products.map((product) => {
            const img = getPreviewImage(product);
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setSheetState({ open: true, mode: "edit", product })}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition hover:shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[var(--color-gray-100)]">
                    {img ? (
                      <Image src={img} alt={product.name} fill sizes="72px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--color-carbon)]">
                        <PackageIcon className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-carbon)]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[var(--color-brand)]">
                      {formatUsd(product.priceUsd)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StockBadge product={product} />
                      {!product.isActive && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronIcon className="h-4 w-4 shrink-0 text-[var(--color-gray-500)]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Product Sheet */}
      <ProductSheet
        sheetState={sheetState}
        onClose={() => setSheetState({ open: false })}
        onSaved={() => void loadProducts()}
      />

      {/* FAB — hidden when empty state shown */}
      {products.length > 0 && (
        <button
          type="button"
          onClick={() => setSheetState({ open: true, mode: "create" })}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-2xl font-bold text-white shadow-lg transition hover:scale-105 active:scale-95 md:bottom-8"
          aria-label="Agregar producto"
        >
          +
        </button>
      )}
    </VendorPageShell>
  );
}
