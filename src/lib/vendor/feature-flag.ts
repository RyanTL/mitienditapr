const ENABLE_VENDOR_MODE_ENV = process.env.ENABLE_VENDOR_MODE;

export const isVendorModeEnabled =
  ENABLE_VENDOR_MODE_ENV === undefined
    ? true
    : ENABLE_VENDOR_MODE_ENV.toLowerCase() === "true";
