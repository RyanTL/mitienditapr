export const VENDOR_ONBOARDING_STEPS = [
  { step: 1, title: "Inicio vendedor", description: "Aprende como vender en la app." },
  { step: 2, title: "Perfil del negocio", description: "Completa informacion basica del negocio." },
  { step: 3, title: "Configurar tienda", description: "Nombre, slug y descripcion de tu tienda." },
  { step: 4, title: "Envios y politicas", description: "Define tarifa de envio y politicas basicas." },
  { step: 5, title: "Conectar cobros", description: "Conecta Stripe Express para recibir pagos." },
  { step: 6, title: "Suscripcion", description: "Activa plan mensual para poder publicar." },
  { step: 7, title: "Primer producto", description: "Crea al menos un producto con variante." },
  { step: 8, title: "Publicar tienda", description: "Revisa requisitos y publica tu tienda." },
] as const;

export type VendorStep = (typeof VENDOR_ONBOARDING_STEPS)[number]["step"];

export const VENDOR_ONBOARDING_STEP_COUNT = VENDOR_ONBOARDING_STEPS.length;

export const VENDOR_DEFAULT_SUBSCRIPTION_PRICE_USD = 10;
export const VENDOR_DEFAULT_SUBSCRIPTION_INTERVAL = "month";

export const VENDOR_ORDER_STATUSES = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "canceled",
] as const;

export type VendorOrderStatus = (typeof VENDOR_ORDER_STATUSES)[number];

export const VENDOR_ORDER_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  new: ["processing", "canceled"],
  processing: ["shipped", "canceled"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

export const VENDOR_SHOP_STATUSES = ["draft", "active", "paused", "unpaid"] as const;

export type VendorShopStatus = (typeof VENDOR_SHOP_STATUSES)[number];

export const VENDOR_ONBOARDING_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export type VendorOnboardingStatus = (typeof VENDOR_ONBOARDING_STATUSES)[number];
