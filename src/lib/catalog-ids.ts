function hash32(input: string, seed: number) {
  let hash = seed >>> 0;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;

  return hash >>> 0;
}

function toHex(value: number) {
  return value.toString(16).padStart(8, "0");
}

export function createStableUuid(input: string) {
  const hex = [
    toHex(hash32(input, 0x811c9dc5)),
    toHex(hash32(input, 0x1b873593)),
    toHex(hash32(input, 0x9747b28c)),
    toHex(hash32(input, 0x85ebca6b)),
  ].join("");

  const chars = hex.split("");

  // UUID version 4 nibble.
  chars[12] = "4";
  // UUID RFC variant nibble.
  const variant = (parseInt(chars[16], 16) & 0x3) | 0x8;
  chars[16] = variant.toString(16);

  const normalized = chars.join("");

  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}

export function createCatalogProductKey(shopSlug: string, productId: string) {
  return `${shopSlug}:${productId}`;
}

export function getCatalogShopDatabaseId(shopSlug: string) {
  return createStableUuid(`shop:${shopSlug}`);
}

export function getCatalogProductDatabaseId(shopSlug: string, productId: string) {
  return createStableUuid(`product:${shopSlug}:${productId}`);
}
