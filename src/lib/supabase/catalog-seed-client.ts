let catalogSeedPromise: Promise<void> | null = null;

async function runCatalogSeedRequest() {
  const response = await fetch("/api/catalog/seed", { method: "POST" });

  if (response.status === 401) {
    return;
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(body?.error ?? "No se pudo sincronizar el catalogo.");
  }
}

export async function ensureCatalogSeeded() {
  if (typeof window === "undefined") {
    return;
  }

  if (!catalogSeedPromise) {
    catalogSeedPromise = runCatalogSeedRequest().catch((error) => {
      catalogSeedPromise = null;
      throw error;
    });
  }

  await catalogSeedPromise;
}
