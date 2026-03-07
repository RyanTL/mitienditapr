let catalogSeedPromise: Promise<void> | null = null;
let catalogSeedLastCompletedAt = 0;
const CATALOG_SEED_MIN_INTERVAL_MS = 15_000;
const IS_CATALOG_SEED_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_CATALOG_SEED?.toLowerCase() === "true";

function isDuplicateKeyError(message: string | undefined) {
  return Boolean(
    message &&
      message.includes("duplicate key value violates unique constraint"),
  );
}

async function runCatalogSeedRequest() {
  if (!IS_CATALOG_SEED_ENABLED) {
    return;
  }

  const response = await fetch("/api/catalog/seed", { method: "POST" });

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return;
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const errorMessage = body?.error;

    // Seed requests can race across tabs/sessions; duplicate-key means rows already exist.
    if (isDuplicateKeyError(errorMessage)) {
      return;
    }

    throw new Error(errorMessage ?? "No se pudo sincronizar el catalogo.");
  }
}

export async function ensureCatalogSeeded() {
  if (typeof window === "undefined") {
    return;
  }

  const shouldStartNewSeed =
    !catalogSeedPromise &&
    Date.now() - catalogSeedLastCompletedAt > CATALOG_SEED_MIN_INTERVAL_MS;

  if (shouldStartNewSeed) {
    catalogSeedPromise = runCatalogSeedRequest()
      .then(() => {
        catalogSeedLastCompletedAt = Date.now();
      })
      .finally(() => {
        catalogSeedPromise = null;
      });
  }

  if (catalogSeedPromise) {
    await catalogSeedPromise;
  }
}
