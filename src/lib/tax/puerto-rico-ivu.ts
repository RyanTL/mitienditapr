/**
 * Puerto Rico combined IVU (Impuesto sobre Ventas y Uso): 10.5% estatal + 1% municipal.
 * Used for marketplace buyer checkout; not legal advice — verify rates for your use case.
 */
export const PR_IVU_RATE = 0.115;

function roundUsdHalfUp(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computePuertoRicoIvuUsd(input: {
  subtotalUsd: number;
  shippingFeeUsd: number;
}): { taxUsd: number; totalUsd: number } {
  const subtotal = Math.max(0, input.subtotalUsd);
  const shipping = Math.max(0, input.shippingFeeUsd);
  const taxableBase = subtotal + shipping;
  const taxUsd = roundUsdHalfUp(taxableBase * PR_IVU_RATE);
  const totalUsd = roundUsdHalfUp(taxableBase + taxUsd);
  return { taxUsd, totalUsd };
}
