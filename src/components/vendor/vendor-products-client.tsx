"use client";

import { useCallback, useEffect, useState } from "react";

import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import {
  archiveVendorProduct,
  createVendorProduct,
  createVendorVariant,
  fetchVendorProducts,
  updateVendorProduct,
} from "@/lib/vendor/client";

type VendorProduct = Awaited<
  ReturnType<typeof fetchVendorProducts>
>["products"][number];

type VariantDraft = {
  title: string;
  priceUsd: string;
  stockQty: string;
};

const DEFAULT_VARIANT_DRAFT: VariantDraft = {
  title: "Nueva variante",
  priceUsd: "10",
  stockQty: "1",
};

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

export function VendorProductsClient() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductPriceUsd, setNewProductPriceUsd] = useState("10");
  const [newProductStockQty, setNewProductStockQty] = useState("1");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});

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
        description: newProductDescription,
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

  const handleArchiveProduct = useCallback(
    async (productId: string) => {
      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await archiveVendorProduct(productId);
        setFeedbackMessage("Producto archivado.");
        await loadProducts();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo archivar el producto.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [loadProducts],
  );

  const handleToggleProduct = useCallback(
    async (product: VendorProduct) => {
      setIsSaving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);

      try {
        await updateVendorProduct(product.id, { isActive: !product.isActive });
        setFeedbackMessage("Producto actualizado.");
        await loadProducts();
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

  return (
    <VendorPageShell
      title="Productos"
      subtitle="Crea, edita y archiva productos con variantes."
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

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Nuevo producto</h2>
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder="Nombre"
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
          <input
            type="text"
            placeholder="Imagen URL"
            value={newProductImageUrl}
            onChange={(event) => setNewProductImageUrl(event.target.value)}
            className="w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
          />
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
              placeholder="Stock"
              value={newProductStockQty}
              onChange={(event) => setNewProductStockQty(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          className="mt-3 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-white)]"
          disabled={isSaving}
          onClick={() => void handleCreateProduct()}
        >
          {isSaving ? "Guardando..." : "Crear producto"}
        </button>
      </article>

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Listado</h2>

        {isLoading ? (
          <p className="mt-3 text-sm text-[var(--color-gray-500)]">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-gray-500)]">
            Aun no tienes productos.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {products.map((product) => {
              const draft = variantDrafts[product.id] ?? DEFAULT_VARIANT_DRAFT;

              return (
                <li
                  key={product.id}
                  className="rounded-2xl border border-[var(--color-gray)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        {product.variants.length} variante(s) • ${product.priceUsd.toFixed(2)}
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
                      {product.isActive ? "Activo" : "Archivado"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
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
                      className="rounded-full border border-[var(--color-gray)] px-3 py-1 text-xs font-semibold"
                      disabled={isSaving}
                      onClick={() => void handleArchiveProduct(product.id)}
                    >
                      Archivar
                    </button>
                  </div>

                  <div className="mt-3 rounded-2xl bg-[var(--color-gray-100)] p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-gray-500)]">
                      Agregar variante
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(event) =>
                          setVariantDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              ...draft,
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
                        value={draft.priceUsd}
                        onChange={(event) =>
                          setVariantDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              ...draft,
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
                        value={draft.stockQty}
                        onChange={(event) =>
                          setVariantDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              ...draft,
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
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </VendorPageShell>
  );
}
