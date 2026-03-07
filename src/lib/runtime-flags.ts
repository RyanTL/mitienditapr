function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return fallback;
}

export const isStrictDbModeEnabled = parseBooleanFlag(
  process.env.ENABLE_STRICT_DB_MODE ?? process.env.NEXT_PUBLIC_ENABLE_STRICT_DB_MODE,
  true,
);

export const isCatalogSeedEnabled = parseBooleanFlag(
  process.env.ENABLE_CATALOG_SEED,
  false,
);
