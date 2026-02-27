"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronDownIcon } from "@/components/icons";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  addVendorProductImage,
  createVendorProduct,
  createVendorVariant,
  deleteVendorProduct,
  deleteVendorProductImage,
  fetchVendorProducts,
  updateVendorProduct,
  uploadVendorImage,
} from "@/lib/vendor/client";

type VendorProduct = Awaited<
  ReturnType<typeof fetchVendorProducts>
>["products"][number];

type VariantDraft = {
  title: string;
  priceUsd: string;
  stockQty: string;
};

type ProductEditDraft = {
  name: string;
  description: string;
  priceUsd: string;
};

const DEFAULT_VARIANT_DRAFT: VariantDraft = {
  title: "Nueva variante",
  priceUsd: "10",
  stockQty: "1",
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=80";

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function getEditDraftFallback(product: VendorProduct): ProductEditDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    priceUsd: product.priceUsd.toFixed(2),
  };
}

export function VendorProductsClient() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingImageByProductId, setUploadingImageByProductId] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductPriceUsd, setNewProductPriceUsd] = useState("10");
  const [newProductStockQty, setNewProductStockQty] = useState("1");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");

  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [productEditDrafts, setProductEditDrafts] = useState<
    Record<string, ProductEditDraft>
  >({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isActiveListOpen, setIsActiveListOpen] = useState(true);
  const [isInactiveListOpen, setIsInactiveListOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchVendorProducts();
      setProducts(response.products);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar productos.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products],
  );
  const inactiveProducts = useMemo(
    () => products.filter((product) => !product.isActive),
    [products],
  );

  const handleCreateProduct = useCallback(async () => {
    const name = newProductName.trim();
    if (!name) {
      setErrorMessage("Debes escribir el nombre del producto.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await createVendorProduct({
        name,
        description: newProductDescription.trim(),
        imageUrl: newProductImageUrl || undefined,
        variant: {
          title: "Default",
          priceUsd: Math.max(0, toNumber(newProductPriceUsd, 0)),
          stockQty: Math.max(0, Math.trunc(toNumber(newProductStockQty, 0))),
        },
      });

      setNewProductName("");
      setNewProductDescription("");
      setNewProductImageUrl("");
      setFeedbackMessage("Producto creado.");
      await loadProducts();
      setIsActiveListOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el producto.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    loadProducts,
    newProductDescription,
    newProductImageUrl,
    newProductName,
    newProductPriceUsd,
    newProductStockQty,
  ]);

  const handleToggleProduct = useCallback(
    async (product: VendorProduct) => {
      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await updateVendorProduct(product.id, { isActive: !product.isActive });
        setFeedbackMessage(product.isActive ? "Producto desactivado." : "Producto activado.");
        await loadProducts();

        if (product.isActive) {
          setIsInactiveListOpen(true);
        } else {
          setIsActiveListOpen(true);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo actualizar el producto.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadProducts],
  );

  const handleDeleteProduct = useCallback(
    async (product: VendorProduct) => {
      const shouldDelete = window.confirm(
        `Eliminar "${product.name}"? Esta accion no se puede deshacer.`,
      );

      if (!shouldDelete) {
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await deleteVendorProduct(product.id);
        setFeedbackMessage("Producto eliminado.");
        setEditingProductId((current) => (current === product.id ? null : current));
        await loadProducts();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo eliminar el producto.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadProducts],
  );

  const handleAddVariant = useCallback(
    async (productId: string) => {
      const draft = variantDrafts[productId] ?? DEFAULT_VARIANT_DRAFT;
      if (!draft.title.trim()) {
        setErrorMessage("Debes indicar el titulo de la variante.");
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await createVendorVariant(productId, {
          title: draft.title.trim(),
          priceUsd: Math.max(0, toNumber(draft.priceUsd, 0)),
          stockQty: Math.max(0, Math.trunc(toNumber(draft.stockQty, 0))),
        });
        setVariantDrafts((current) => ({
          ...current,
          [productId]: DEFAULT_VARIANT_DRAFT,
        }));
        setFeedbackMessage("Variante creada.");
        await loadProducts();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo crear la variante.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadProducts, variantDrafts],
  );

  const handleUploadNewProductImage = useCallback(async (file: File) => {
    setIsUploadingImage(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const result = await uploadVendorImage(file);
      setNewProductImageUrl(result.url);
      setFeedbackMessage("Imagen del producto subida.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir la imagen.";
      setErrorMessage(message);
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const handleUploadProductImage = useCallback(
    async (productId: string, file: File) => {
      setUploadingImageByProductId((current) => ({
        ...current,
        [productId]: true,
      }));
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        const upload = await uploadVendorImage(file);
        await addVendorProductImage(productId, { imageUrl: upload.url });
        setFeedbackMessage("Foto agregada al producto.");
        await loadProducts();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo agregar la foto.";
        setErrorMessage(message);
      } finally {
        setUploadingImageByProductId((current) => ({
          ...current,
          [productId]: false,
        }));
      }
    },
    [loadProducts],
  );

  const handleDeleteProductImage = useCallback(
    async (productId: string, imageId: string) => {
      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await deleteVendorProductImage(productId, imageId);
        setFeedbackMessage("Foto eliminada.");
        await loadProducts();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo eliminar la foto.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadProducts],
  );

  const handleStartEdit = useCallback((product: VendorProduct) => {
    setEditingProductId(product.id);
    setProductEditDrafts((current) => ({
      ...current,
      [product.id]: current[product.id] ?? getEditDraftFallback(product),
    }));
  }, []);

  const handleCancelEdit = useCallback((product: VendorProduct) => {
    setEditingProductId((current) => (current === product.id ? null : current));
    setProductEditDrafts((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
  }, []);

  const handleSaveProductEdits = useCallback(
    async (product: VendorProduct) => {
      const draft = productEditDrafts[product.id];
      if (!draft || !draft.name.trim()) {
        setErrorMessage("El nombre del producto es requerido.");
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await updateVendorProduct(product.id, {
          name: draft.name.trim(),
          description: draft.description.trim(),
          priceUsd: Math.max(0, toNumber(draft.priceUsd, product.priceUsd)),
        });

        setFeedbackMessage("Producto actualizado.");
        setEditingProductId(null);
        await loadProducts();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo actualizar el producto.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadProducts, productEditDrafts],
  );

  const renderProductCard = (product: VendorProduct) => {
    const isEditing = editingProductId === product.id;
    const draft = productEditDrafts[product.id] ?? getEditDraftFallback(product);
    const variantDraft = variantDrafts[product.id] ?? DEFAULT_VARIANT_DRAFT;
    const previewImage =
      product.images[0]?.imageUrl || product.imageUrl || FALLBACK_PRODUCT_IMAGE;

    return (
      <li
        key={product.id}
        className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3 shadow-[0_6px_18px_var(--shadow-black-003)]"
      >
        <div className="flex items-start gap-3">
          <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-2xl bg-[var(--color-gray-100)]">
            <Image
              src={previewImage}
              alt={product.name}
              fill
              unoptimized
              sizes="78px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="truncate text-sm font-semibold text-[var(--color-carbon)]">
                  {product.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--color-gray-500)]">
                  {product.description || "Sin descripcion."}
                </p>
              </div>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  product.isActive
                    ? "bg-[var(--color-brand)] text-[var(--color-white)]"
                    : "bg-[var(--color-gray)] text-[var(--color-carbon)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {product.isActive ? "Activo" : "Desactivado"}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--color-carbon)]">
              ${product.priceUsd.toFixed(2)}
            </p>
            <p className="text-[11px] text-[var(--color-gray-500)]">
              {product.variants.length} variante(s)
            </p>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-gray-500)]">
            Fotos
          </p>
          {product.images.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--color-gray-500)]">
              Este producto no tiene fotos adicionales.
            </p>
          ) : (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((image) => (
                <div
                  key={image.id}
                  className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[var(--color-gray)]"
                >
                  <Image
                    src={image.imageUrl}
                    alt={image.alt ?? product.name}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                  {isEditing ? (
                    <button
                      type="button"
                      className="absolute inset-x-1 bottom-1 rounded-md bg-[var(--overlay-black-055)] px-1 py-0.5 text-[10px] font-semibold text-[var(--color-white)]"
                      disabled={isSaving}
                      onClick={() => void handleDeleteProductImage(product.id, image.id)}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
            disabled={isSaving}
            onClick={() => (isEditing ? handleCancelEdit(product) : handleStartEdit(product))}
          >
            {isEditing ? "Cancelar" : "Editar"}
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
            disabled={isSaving}
            onClick={() => void handleToggleProduct(product)}
          >
            {product.isActive ? "Desactivar" : "Activar"}
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--color-danger)] px-3 py-1 text-xs font-semibold text-[var(--color-danger)]"
            disabled={isSaving}
            onClick={() => void handleDeleteProduct(product)}
          >
            Eliminar
          </button>
        </div>

        {isEditing ? (
          <div className="mt-3 rounded-2xl bg-[var(--color-gray-100)] p-3">
            <div className="grid gap-2">
              <input
                type="text"
                value={draft.name}
                onChange={(event) =>
                  setProductEditDrafts((current) => ({
                    ...current,
                    [product.id]: {
                      ...draft,
                      name: event.target.value,
                    },
                  }))
                }
                className="rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setProductEditDrafts((current) => ({
                    ...current,
                    [product.id]: {
                      ...draft,
                      description: event.target.value,
                    },
                  }))
                }
                className="min-h-20 rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.priceUsd}
                onChange={(event) =>
                  setProductEditDrafts((current) => ({
                    ...current,
                    [product.id]: {
                      ...draft,
                      priceUsd: event.target.value,
                    },
                  }))
                }
                className="rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-full border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-1 text-xs font-semibold">
                {uploadingImageByProductId[product.id] ? "Subiendo..." : "Agregar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={Boolean(uploadingImageByProductId[product.id])}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (file) {
                      void handleUploadProductImage(product.id, file);
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="rounded-full bg-[var(--color-brand)] px-3 py-1 text-xs font-semibold text-[var(--color-white)]"
                disabled={isSaving}
                onClick={() => void handleSaveProductEdits(product)}
              >
                Guardar cambios
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-[var(--color-white)] p-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-gray-500)]">
                Agregar variante
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={variantDraft.title}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [product.id]: {
                        ...variantDraft,
                        title: event.target.value,
                      },
                    }))
                  }
                  className="rounded-lg border border-[var(--color-gray)] bg-[var(--color-white)] px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={variantDraft.priceUsd}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [product.id]: {
                        ...variantDraft,
                        priceUsd: event.target.value,
                      },
                    }))
                  }
                  className="rounded-lg border border-[var(--color-gray)] bg-[var(--color-white)] px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={variantDraft.stockQty}
                  onChange={(event) =>
                    setVariantDrafts((current) => ({
                      ...current,
                      [product.id]: {
                        ...variantDraft,
                        stockQty: event.target.value,
                      },
                    }))
                  }
                  className="rounded-lg border border-[var(--color-gray)] bg-[var(--color-white)] px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                className="mt-2 rounded-full bg-[var(--color-carbon)] px-3 py-1 text-xs font-semibold text-[var(--color-white)]"
                disabled={isSaving}
                onClick={() => void handleAddVariant(product.id)}
              >
                Agregar variante
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <VendorPageShell
      title="Productos"
      subtitle="Gestion rapida para crear, editar y organizar tu catalogo."
    >
      {feedbackMessage ? (
        <article className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-brand)]">
          {feedbackMessage}
        </article>
      ) : null}
      {errorMessage ? (
        <article className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-white)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </article>
      ) : null}

      <div className="space-y-3 md:grid md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-start md:gap-4 md:space-y-0">
      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Nuevo producto</h2>
        <p className="mt-1 text-xs text-[var(--color-gray-500)]">
          Formulario rapido para agregar un producto en menos de un minuto.
        </p>
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={newProductName}
            onChange={(event) => setNewProductName(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Descripcion"
            value={newProductDescription}
            onChange={(event) => setNewProductDescription(event.target.value)}
            className="min-h-20 w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
          />
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-gray-500)]">
              Foto principal
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={isUploadingImage}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  void handleUploadNewProductImage(file);
                }
              }}
              className="mt-1 block w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
            />
            {isUploadingImage ? (
              <p className="mt-1 text-xs text-[var(--color-gray-500)]">Subiendo imagen...</p>
            ) : null}
            {newProductImageUrl ? (
              <Image
                src={newProductImageUrl}
                alt="Vista previa del producto"
                width={80}
                height={80}
                unoptimized
                className="mt-2 h-20 w-20 rounded-xl border border-[var(--color-gray)] object-cover"
              />
            ) : null}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Precio"
              value={newProductPriceUsd}
              onChange={(event) => setNewProductPriceUsd(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Stock inicial"
              value={newProductStockQty}
              onChange={(event) => setNewProductStockQty(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          className="mt-3 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
          disabled={isSaving || isUploadingImage}
          onClick={() => void handleCreateProduct()}
        >
          {isSaving ? "Guardando..." : "Crear producto"}
        </button>
      </article>

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Listado de productos</h2>

        {isLoading ? (
          <p className="mt-3 text-sm text-[var(--color-gray-500)]">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-gray-500)]">
            Aun no tienes productos.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <section className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setIsActiveListOpen((current) => !current)}
              >
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Productos activos ({activeProducts.length})
                </span>
                <ChevronDownIcon
                  className={[
                    "h-4 w-4 text-[var(--color-carbon)] transition-transform duration-200",
                    isActiveListOpen ? "rotate-180" : "rotate-0",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>

              {isActiveListOpen ? (
                activeProducts.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--color-gray-500)]">
                    No tienes productos activos.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">{activeProducts.map(renderProductCard)}</ul>
                )
              ) : null}
            </section>

            <section className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setIsInactiveListOpen((current) => !current)}
              >
                <span className="text-sm font-semibold text-[var(--color-carbon)]">
                  Productos desactivados ({inactiveProducts.length})
                </span>
                <ChevronDownIcon
                  className={[
                    "h-4 w-4 text-[var(--color-carbon)] transition-transform duration-200",
                    isInactiveListOpen ? "rotate-180" : "rotate-0",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>

              {isInactiveListOpen ? (
                inactiveProducts.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--color-gray-500)]">
                    No tienes productos desactivados.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                    {inactiveProducts.map(renderProductCard)}
                  </ul>
                )
              ) : null}
            </section>
          </div>
        )}
      </article>
      </div>
    </VendorPageShell>
  );
}
