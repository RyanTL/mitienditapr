import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasValidImageMagicBytes } from "@/lib/image-validation";
import {
  type OrderFulfillmentMethod,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
} from "@/lib/orders/constants";

const DEFAULT_ATH_RECEIPTS_BUCKET = "ath-receipts";
const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ATH_RECEIPT_SIGNED_URL_TTL_SECONDS = 60 * 60;

type BuyerProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  zip_code: string | null;
};

type CheckoutShopRow = {
  id: string;
  slug: string;
  vendor_profile_id: string;
  vendor_name: string;
  is_active: boolean;
  status: string;
  shipping_flat_fee_usd: number;
  offers_pickup: boolean;
  stripe_connect_account_id: string | null;
  ath_movil_phone: string | null;
};

type CartItemRow = {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  price_usd: number;
  image_url: string | null;
  is_active: boolean;
};

type VariantRow = {
  id: string;
  product_id: string;
  title: string;
  price_usd: number;
  stock_qty: number | null;
  is_active: boolean;
  created_at: string;
};

type PolicyVersionRow = {
  id: string;
  policy_type: "terms" | "shipping";
  is_current: boolean;
};

type ReservedInventoryRow = {
  variantId: string;
  previousStockQty: number;
  nextStockQty: number;
};

export type CheckoutPolicyAcceptanceInput = {
  shopId: string;
  termsVersionId: string;
  shippingVersionId: string;
  acceptedAt: string;
  acceptanceText: string;
};

export type CheckoutFulfillmentInput = {
  method: OrderFulfillmentMethod;
  shippingAddress?: string | null;
  shippingZipCode?: string | null;
  pickupNotes?: string | null;
};

export type CheckoutBuyerInput = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type UploadedAthReceipt = {
  bucket: string;
  path: string;
  publicName: string;
};

export type PreparedCheckoutOrder = {
  buyer: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string;
  };
  shop: CheckoutShopRow & {
    supportsStripe: boolean;
    supportsAthMovil: boolean;
  };
  fulfillment: {
    method: OrderFulfillmentMethod;
    shippingAddress: string | null;
    shippingZipCode: string | null;
    pickupNotes: string | null;
  };
  policyAcceptance: CheckoutPolicyAcceptanceInput;
  paymentMethod: OrderPaymentMethod;
  cartItems: Array<{
    cartItemId: string;
    productId: string;
    productVariantId: string;
    quantity: number;
    productName: string;
    unitPriceUsd: number;
    stockQty: number | null;
  }>;
  subtotalUsd: number;
  shippingFeeUsd: number;
  totalUsd: number;
};

export type CreatedCheckoutOrder = {
  orderId: string;
  subtotalUsd: number;
  shippingFeeUsd: number;
  totalUsd: number;
  buyer: PreparedCheckoutOrder["buyer"];
  shop: PreparedCheckoutOrder["shop"];
  fulfillment: PreparedCheckoutOrder["fulfillment"];
  items: PreparedCheckoutOrder["cartItems"];
};

function normalizeTrimmed(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeFileName(input: string) {
  const trimmed = input.trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9._-]+/g, "-");
  return normalized.length > 0 ? normalized : `receipt-${randomUUID()}.jpg`;
}

function inferBuyerName(profile: BuyerProfileRow, input: CheckoutBuyerInput) {
  const explicitName = normalizeTrimmed(input.fullName);
  if (explicitName) {
    return explicitName;
  }

  const profileName = normalizeTrimmed(profile.full_name);
  if (profileName) {
    return profileName;
  }

  const email = normalizeTrimmed(input.email) ?? normalizeTrimmed(profile.email);
  if (email?.includes("@")) {
    return email.split("@")[0] ?? "Cliente";
  }

  return "Cliente";
}

function assertShippingZip(zipCode: string | null) {
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    throw new Error("Debes escribir un código postal válido de 5 dígitos.");
  }
}

async function ensurePrivateBucket(admin: SupabaseClient, bucketName: string) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const existing = buckets?.find((bucket) => bucket.name === bucketName);
  if (existing) {
    return;
  }

  const { error: createError } = await admin.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: `${MAX_RECEIPT_FILE_SIZE_BYTES}`,
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
      "image/heif",
    ],
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
}

export async function uploadAthReceipt(
  admin: SupabaseClient,
  buyerProfileId: string,
  file: File,
) {
  if (!file.type.startsWith("image/")) {
    throw new Error("El recibo debe ser una imagen.");
  }

  if (file.size <= 0 || file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    throw new Error("El recibo debe pesar menos de 5MB.");
  }

  const bucketName =
    process.env.SUPABASE_ATH_RECEIPTS_BUCKET ?? DEFAULT_ATH_RECEIPTS_BUCKET;
  await ensurePrivateBucket(admin, bucketName);

  const safeName = sanitizeFileName(file.name);
  const objectPath = `${buyerProfileId}/${Date.now()}-${randomUUID()}-${safeName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (!hasValidImageMagicBytes(fileBuffer)) {
    throw new Error("El recibo no es una imagen válida.");
  }

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(objectPath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    bucket: bucketName,
    path: objectPath,
    publicName: safeName,
  } satisfies UploadedAthReceipt;
}

export async function createReceiptSignedUrl(
  admin: SupabaseClient,
  bucket: string | null | undefined,
  path: string | null | undefined,
) {
  if (!bucket || !path) {
    return null;
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, ATH_RECEIPT_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl ?? null;
}

export async function fetchBuyerProfile(admin: SupabaseClient, profileId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo cargar tu perfil.");
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    full_name: (row.full_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    zip_code: typeof row.zip_code === "string" ? row.zip_code : null,
  } satisfies BuyerProfileRow;
}

export async function fetchCheckoutShopBySlug(
  admin: SupabaseClient,
  shopSlug: string,
) {
  const { data, error } = await admin
    .from("shops")
    .select(
      "id,slug,vendor_profile_id,vendor_name,is_active,status,shipping_flat_fee_usd,offers_pickup,stripe_connect_account_id,ath_movil_phone",
    )
    .eq("slug", shopSlug)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "No encontramos esa tienda.");
  }

  const shop = data as CheckoutShopRow;
  return {
    ...shop,
    supportsStripe: Boolean(shop.stripe_connect_account_id),
    supportsAthMovil: Boolean(shop.ath_movil_phone),
  };
}

async function validateCheckoutPolicies(
  admin: SupabaseClient,
  shopId: string,
  policyAcceptance: CheckoutPolicyAcceptanceInput,
) {
  if (policyAcceptance.shopId !== shopId) {
    throw new Error("La aceptación de políticas no coincide con la tienda.");
  }

  const { data, error } = await admin
    .from("shop_policy_versions")
    .select("id,policy_type,is_current")
    .eq("shop_id", shopId)
    .in("id", [policyAcceptance.termsVersionId, policyAcceptance.shippingVersionId]);

  if (error) {
    throw new Error(error.message);
  }

  const policyRows = (data ?? []) as PolicyVersionRow[];
  const termsRow = policyRows.find((row) => row.id === policyAcceptance.termsVersionId);
  const shippingRow = policyRows.find(
    (row) => row.id === policyAcceptance.shippingVersionId,
  );

  if (!termsRow || termsRow.policy_type !== "terms" || !termsRow.is_current) {
    throw new Error("Debes aceptar la versión actual de los Términos.");
  }

  if (
    !shippingRow ||
    shippingRow.policy_type !== "shipping" ||
    !shippingRow.is_current
  ) {
    throw new Error("Debes aceptar la versión actual de la Política de envío.");
  }
}

async function loadShopCartItems(
  admin: SupabaseClient,
  buyerProfileId: string,
  shopId: string,
) {
  const { data: cartRows, error: cartError } = await admin
    .from("cart_items")
    .select("id,product_id,product_variant_id,quantity")
    .eq("profile_id", buyerProfileId)
    .order("created_at", { ascending: false });

  if (cartError) {
    throw new Error(cartError.message);
  }

  const typedCartRows = (cartRows ?? []) as CartItemRow[];
  if (typedCartRows.length === 0) {
    throw new Error("Tu carrito está vacío.");
  }

  const productIds = Array.from(new Set(typedCartRows.map((item) => item.product_id)));
  const { data: productRows, error: productError } = await admin
    .from("products")
    .select("id,shop_id,name,price_usd,image_url,is_active")
    .in("id", productIds);

  if (productError) {
    throw new Error(productError.message);
  }

  const products = (productRows ?? []) as ProductRow[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const shopCartRows = typedCartRows.filter((item) => {
    const product = productById.get(item.product_id);
    return product?.shop_id === shopId;
  });

  if (shopCartRows.length === 0) {
    throw new Error("Tu carrito no tiene productos de esta tienda.");
  }

  const shopProductIds = Array.from(new Set(shopCartRows.map((item) => item.product_id)));
  const { data: variantRows, error: variantError } = await admin
    .from("product_variants")
    .select("id,product_id,title,price_usd,stock_qty,is_active,created_at")
    .in("product_id", shopProductIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (variantError) {
    throw new Error(variantError.message);
  }

  const activeVariants = (variantRows ?? []) as VariantRow[];
  const variantsByProductId = activeVariants.reduce((map, row) => {
    const current = map.get(row.product_id) ?? [];
    map.set(row.product_id, [...current, row]);
    return map;
  }, new Map<string, VariantRow[]>());
  const activeVariantById = new Map(activeVariants.map((variant) => [variant.id, variant]));

  return shopCartRows.map((cartItem) => {
    const product = productById.get(cartItem.product_id);
    if (!product || !product.is_active) {
      throw new Error("Uno de los productos del carrito ya no está disponible.");
    }

    const selectedVariant =
      (cartItem.product_variant_id
        ? activeVariantById.get(cartItem.product_variant_id)
        : null) ?? variantsByProductId.get(cartItem.product_id)?.[0];

    if (!selectedVariant) {
      throw new Error(`El producto "${product.name}" no está disponible para comprar.`);
    }

    return {
      cartItemId: cartItem.id,
      productId: product.id,
      productVariantId: selectedVariant.id,
      quantity: cartItem.quantity,
      productName: product.name,
      unitPriceUsd: Number(selectedVariant.price_usd ?? product.price_usd ?? 0),
      stockQty: selectedVariant.stock_qty,
    };
  });
}

export async function prepareCheckoutOrder(input: {
  admin: SupabaseClient;
  buyerProfileId: string;
  shopSlug: string;
  paymentMethod: OrderPaymentMethod;
  fulfillment: CheckoutFulfillmentInput;
  buyerInput: CheckoutBuyerInput;
  policyAcceptance: CheckoutPolicyAcceptanceInput;
}) {
  const { admin, buyerProfileId, shopSlug, paymentMethod, fulfillment, buyerInput } = input;
  const [buyerProfile, shop] = await Promise.all([
    fetchBuyerProfile(admin, buyerProfileId),
    fetchCheckoutShopBySlug(admin, shopSlug),
  ]);

  if (!shop.is_active || shop.status !== "active") {
    throw new Error("Esta tienda no está disponible para comprar.");
  }

  if (paymentMethod === "stripe" && !shop.supportsStripe) {
    throw new Error("Esta tienda todavía no acepta pagos con tarjeta.");
  }

  if (paymentMethod === "ath_movil" && !shop.supportsAthMovil) {
    throw new Error("Esta tienda no acepta pagos por ATH Móvil.");
  }

  const normalizedPhone =
    normalizeTrimmed(buyerInput.phone) ?? normalizeTrimmed(buyerProfile.phone);
  if (!normalizedPhone) {
    throw new Error("Debes escribir un teléfono para continuar.");
  }

  const normalizedFulfillment: PreparedCheckoutOrder["fulfillment"] = {
    method: fulfillment.method,
    shippingAddress: normalizeTrimmed(fulfillment.shippingAddress),
    shippingZipCode: normalizeTrimmed(fulfillment.shippingZipCode),
    pickupNotes: normalizeTrimmed(fulfillment.pickupNotes),
  };

  if (fulfillment.method === "pickup" && !shop.offers_pickup) {
    throw new Error("Esta tienda no ofrece recogido.");
  }

  if (fulfillment.method === "shipping") {
    normalizedFulfillment.shippingAddress =
      normalizedFulfillment.shippingAddress ?? normalizeTrimmed(buyerProfile.address);
    normalizedFulfillment.shippingZipCode =
      normalizedFulfillment.shippingZipCode ?? normalizeTrimmed(buyerProfile.zip_code);

    if (!normalizedFulfillment.shippingAddress) {
      throw new Error("Debes escribir la dirección de envío.");
    }

    assertShippingZip(normalizedFulfillment.shippingZipCode);
  } else {
    normalizedFulfillment.shippingAddress = null;
    normalizedFulfillment.shippingZipCode = null;
  }

  await validateCheckoutPolicies(admin, shop.id, input.policyAcceptance);
  const cartItems = await loadShopCartItems(admin, buyerProfileId, shop.id);
  const subtotalUsd = cartItems.reduce(
    (total, item) => total + item.unitPriceUsd * item.quantity,
    0,
  );
  const shippingFeeUsd =
    fulfillment.method === "shipping" ? Number(shop.shipping_flat_fee_usd ?? 0) : 0;

  return {
    buyer: {
      id: buyerProfile.id,
      fullName: inferBuyerName(buyerProfile, buyerInput),
      email: normalizeTrimmed(buyerInput.email) ?? normalizeTrimmed(buyerProfile.email),
      phone: normalizedPhone,
    },
    shop,
    fulfillment: normalizedFulfillment,
    policyAcceptance: input.policyAcceptance,
    paymentMethod,
    cartItems,
    subtotalUsd,
    shippingFeeUsd,
    totalUsd: subtotalUsd + shippingFeeUsd,
  } satisfies PreparedCheckoutOrder;
}

async function reserveInventory(
  admin: SupabaseClient,
  items: PreparedCheckoutOrder["cartItems"],
) {
  const reserved: ReservedInventoryRow[] = [];

  for (const item of items) {
    if (item.stockQty === null) {
      continue;
    }

    const nextStockQty = item.stockQty - item.quantity;
    if (nextStockQty < 0) {
      throw new Error(`"${item.productName}" ya no tiene inventario suficiente.`);
    }

    const { data, error } = await admin
      .from("product_variants")
      .update({ stock_qty: nextStockQty })
      .eq("id", item.productVariantId)
      .eq("stock_qty", item.stockQty)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error(`"${item.productName}" cambió de inventario. Intenta otra vez.`);
    }

    reserved.push({
      variantId: item.productVariantId,
      previousStockQty: item.stockQty,
      nextStockQty,
    });
  }

  return reserved;
}

async function rollbackReservedInventory(
  admin: SupabaseClient,
  reservedRows: ReservedInventoryRow[],
) {
  for (const row of reservedRows) {
    await admin
      .from("product_variants")
      .update({ stock_qty: row.previousStockQty })
      .eq("id", row.variantId)
      .eq("stock_qty", row.nextStockQty);
  }
}

export async function createCheckoutOrder(input: {
  admin: SupabaseClient;
  preparedOrder: PreparedCheckoutOrder;
  paymentStatus: OrderPaymentStatus;
  receipt?: {
    bucket: string;
    path: string;
    note: string | null;
  } | null;
}) {
  const { admin, preparedOrder, paymentStatus, receipt } = input;
  const reservedRows = await reserveInventory(admin, preparedOrder.cartItems);

  let orderId: string | null = null;

  try {
    const { data: orderData, error: orderError } = await admin
      .from("orders")
      .insert({
        profile_id: preparedOrder.buyer.id,
        shop_id: preparedOrder.shop.id,
        status: "pending",
        payment_method: preparedOrder.paymentMethod,
        payment_status: paymentStatus,
        fulfillment_method: preparedOrder.fulfillment.method,
        subtotal_usd: preparedOrder.subtotalUsd,
        shipping_fee_usd: preparedOrder.shippingFeeUsd,
        total_usd: preparedOrder.totalUsd,
        buyer_name: preparedOrder.buyer.fullName,
        buyer_email: preparedOrder.buyer.email,
        buyer_phone: preparedOrder.buyer.phone,
        shipping_address: preparedOrder.fulfillment.shippingAddress,
        shipping_zip_code: preparedOrder.fulfillment.shippingZipCode,
        pickup_notes: preparedOrder.fulfillment.pickupNotes,
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      throw new Error(orderError?.message ?? "No se pudo crear la orden.");
    }

    orderId = String(orderData.id);

    const { error: itemsError } = await admin.from("order_items").insert(
      preparedOrder.cartItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_variant_id: item.productVariantId,
        quantity: item.quantity,
        unit_price_usd: item.unitPriceUsd,
      })),
    );

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const { error: policyError } = await admin.from("order_policy_snapshots").insert({
      order_id: orderId,
      shop_id: preparedOrder.policyAcceptance.shopId,
      terms_version_id: preparedOrder.policyAcceptance.termsVersionId,
      shipping_version_id: preparedOrder.policyAcceptance.shippingVersionId,
      accepted_at: preparedOrder.policyAcceptance.acceptedAt,
      acceptance_text: preparedOrder.policyAcceptance.acceptanceText,
    });

    if (policyError) {
      throw new Error(policyError.message);
    }

    const { error: paymentError } = await admin.from("order_payments").insert({
      order_id: orderId,
      provider: preparedOrder.paymentMethod,
      status: paymentStatus,
      amount_usd: preparedOrder.totalUsd,
      receipt_image_bucket: receipt?.bucket ?? null,
      receipt_image_path: receipt?.path ?? null,
      receipt_note: receipt?.note ?? null,
    });

    if (paymentError) {
      throw new Error(paymentError.message);
    }

    return {
      orderId,
      subtotalUsd: preparedOrder.subtotalUsd,
      shippingFeeUsd: preparedOrder.shippingFeeUsd,
      totalUsd: preparedOrder.totalUsd,
      buyer: preparedOrder.buyer,
      shop: preparedOrder.shop,
      fulfillment: preparedOrder.fulfillment,
      items: preparedOrder.cartItems,
    } satisfies CreatedCheckoutOrder;
  } catch (error) {
    if (orderId) {
      await admin.from("orders").delete().eq("id", orderId);
    }
    await rollbackReservedInventory(admin, reservedRows);
    throw error;
  }
}

export async function clearPurchasedCartItems(
  admin: SupabaseClient,
  buyerProfileId: string,
  orderId: string,
) {
  const { data: orderItemsData, error: orderItemsError } = await admin
    .from("order_items")
    .select("product_id,quantity")
    .eq("order_id", orderId);

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const orderItems = (orderItemsData ?? []) as Array<{
    product_id: string;
    quantity: number;
  }>;
  if (orderItems.length === 0) {
    return;
  }

  const quantityByProductId = orderItems.reduce((map, item) => {
    map.set(item.product_id, (map.get(item.product_id) ?? 0) + item.quantity);
    return map;
  }, new Map<string, number>());

  const productIds = Array.from(quantityByProductId.keys());
  const { data: cartRows, error: cartError } = await admin
    .from("cart_items")
    .select("id,product_id,quantity")
    .eq("profile_id", buyerProfileId)
    .in("product_id", productIds);

  if (cartError) {
    throw new Error(cartError.message);
  }

  const cartItems = (cartRows ?? []) as Array<{
    id: string;
    product_id: string;
    quantity: number;
  }>;

  for (const cartItem of cartItems) {
    const purchasedQty = quantityByProductId.get(cartItem.product_id) ?? 0;
    if (purchasedQty <= 0) {
      continue;
    }

    const nextQty = cartItem.quantity - purchasedQty;
    if (nextQty <= 0) {
      const { error } = await admin.from("cart_items").delete().eq("id", cartItem.id);
      if (error) {
        throw new Error(error.message);
      }
      continue;
    }

    const { error } = await admin
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", cartItem.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function releaseOrderInventory(admin: SupabaseClient, orderId: string) {
  const { data, error } = await admin
    .from("order_items")
    .select("product_variant_id,quantity")
    .eq("order_id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as Array<{
    product_variant_id: string | null;
    quantity: number;
  }>;

  for (const item of items) {
    if (!item.product_variant_id) {
      continue;
    }

    const { data: variantData, error: variantError } = await admin
      .from("product_variants")
      .select("id,stock_qty")
      .eq("id", item.product_variant_id)
      .maybeSingle();

    if (variantError) {
      throw new Error(variantError.message);
    }

    if (!variantData || variantData.stock_qty === null) {
      continue;
    }

    const { error: updateError } = await admin
      .from("product_variants")
      .update({
        stock_qty: Number(variantData.stock_qty) + item.quantity,
      })
      .eq("id", item.product_variant_id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

export async function updateOrderPaymentState(input: {
  admin: SupabaseClient;
  orderId: string;
  paymentStatus: OrderPaymentStatus;
  orderStatus?: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  vendorStatus?: "new" | "processing" | "shipped" | "delivered" | "canceled";
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  failedReason?: string | null;
  verifiedByProfileId?: string | null;
  verifiedAt?: string | null;
}) {
  const {
    admin,
    orderId,
    paymentStatus,
    orderStatus,
    vendorStatus,
    paymentIntentId,
    checkoutSessionId,
    failedReason,
    verifiedByProfileId,
    verifiedAt,
  } = input;

  const orderUpdates: Record<string, unknown> = {
    payment_status: paymentStatus,
  };
  if (orderStatus) {
    orderUpdates.status = orderStatus;
  }
  if (vendorStatus) {
    orderUpdates.vendor_status = vendorStatus;
  }

  const { error: orderError } = await admin.from("orders").update(orderUpdates).eq("id", orderId);
  if (orderError) {
    throw new Error(orderError.message);
  }

  const paymentUpdates: Record<string, unknown> = {
    status: paymentStatus,
    failed_reason: failedReason ?? null,
  };
  if (paymentIntentId !== undefined) {
    paymentUpdates.stripe_payment_intent_id = paymentIntentId;
  }
  if (checkoutSessionId !== undefined) {
    paymentUpdates.stripe_checkout_session_id = checkoutSessionId;
  }
  if (verifiedByProfileId !== undefined) {
    paymentUpdates.verified_by_profile_id = verifiedByProfileId;
  }
  if (verifiedAt !== undefined) {
    paymentUpdates.verified_at = verifiedAt;
  }

  const { error: paymentError } = await admin
    .from("order_payments")
    .update(paymentUpdates)
    .eq("order_id", orderId);

  if (paymentError) {
    throw new Error(paymentError.message);
  }
}

export async function findOrderPaymentByCheckoutSessionId(
  admin: SupabaseClient,
  checkoutSessionId: string,
) {
  const { data, error } = await admin
    .from("order_payments")
    .select("order_id,provider,status,stripe_checkout_session_id,stripe_payment_intent_id")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as
    | {
        order_id: string;
        provider: OrderPaymentMethod;
        status: OrderPaymentStatus;
        stripe_checkout_session_id: string | null;
        stripe_payment_intent_id: string | null;
      }
    | null) ?? null;
}
