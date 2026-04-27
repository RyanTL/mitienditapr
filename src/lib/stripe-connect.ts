/**
 * Stripe Connect account IDs always start with "acct_". Placeholder / dev strings
 * (e.g. "dev_connect_...") must not be sent to the Stripe API.
 */
export function isStripeConnectAccountId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("acct_");
}
