let catalogSeedPromise: Promise<void> | null = null;

function isDuplicateKeyError(message: string | undefined) {
  return Boolean(
    message &&
      message.includes("duplicate key value violates unique constraint"),
  );
}

async function runCatalogSeedRequest() {
  const response = await fetch("/api/catalog/seed", { method: "POST" });

  if (response.status === 401) {
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

  if (!catalogSeedPromise) {
    catalogSeedPromise = runCatalogSeedRequest().catch((error) => {
      catalogSeedPromise = null;
      throw error;
    });
  }

  await catalogSeedPromise;
}
