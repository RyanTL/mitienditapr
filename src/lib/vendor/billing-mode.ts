const BYPASS_ENV = process.env.ENABLE_VENDOR_BILLING_BYPASS;

function parseBooleanFlag(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return null;
}

const parsedBypass = parseBooleanFlag(BYPASS_ENV);

// In development we default to bypass to keep product work unblocked.
export const isVendorBillingBypassEnabled =
  parsedBypass ?? process.env.NODE_ENV !== "production";
