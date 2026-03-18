import { NextResponse } from "next/server";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { sendVendorNewOrderEmail, sendBuyerOrderConfirmationEmail } from "@/lib/email/resend";
import { checkRateLimit } from "@/lib/rate-limit";

type CartItemRow = {
  id: string;
  product_id: string;
  quantity: number;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  price_usd: number;
  image_url: string | null;
};

type VariantRow = {
  id: string;
  product_id: string;
};

type ShopRow = {
  id: string;
  slug: string;
  vendor_name: string;
  vendor_profile_id: string;
  is_active: boolean;
  ath_movil_phone: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export async function POST(request: Request) {
  const rateCheck = checkRateLimit(request, "checkout:ath-movil", {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      { status: 429 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: { shopSlug?: string };
  try {
    body = (await request.json()) as { shopSlug?: string };
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const shopSlug = typeof body.shopSlug === "string" ? body.shopSlug.trim() : null;
  if (!shopSlug) {
    return NextResponse.json({ error: "Falta el slug de la tienda." }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    adminClient = supabase;
  }

  // Fetch the shop
  const { data: shopData, error: shopError } = await adminClient
    .from("shops")
    .select("id,slug,vendor_name,vendor_profile_id,is_active,ath_movil_phone")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (shopError || !shopData) {
    return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
  }

  const shop = shopData as ShopRow;

  if (!shop.is_active) {
    return NextResponse.json({ error: "Esta tienda no está disponible." }, { status: 400 });
  }

  if (!shop.ath_movil_phone) {
    return NextResponse.json(
      { error: "Esta tienda no acepta pagos por ATH Móvil." },
      { status: 400 },
    );
  }

  // Fetch buyer's cart items
  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("id,product_id,quantity")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (cartError) {
    return NextResponse.json({ error: "No se pudo cargar el carrito." }, { status: 500 });
  }

  const typedCartRows = (cartRows ?? []) as CartItemRow[];

  if (typedCartRows.length === 0) {
    return NextResponse.json({ error: "El carrito está vacío." }, { status: 400 });
  }

  // Filter to items from this shop
  const productIds = Array.from(new Set(typedCartRows.map((item) => item.product_id)));
  const { data: productRows, error: productsError } = await adminClient
    .from("products")
    .select("id,shop_id,name,price_usd,image_url")
    .in("id", productIds)
    .eq("shop_id", shop.id)
    .eq("is_active", true);

  if (productsError) {
    return NextResponse.json({ error: "No se pudo cargar los productos." }, { status: 500 });
  }

  const shopProducts = (productRows ?? []) as ProductRow[];
  if (shopProducts.length === 0) {
    return NextResponse.json(
      { error: "No hay productos activos de esta tienda en el carrito." },
      { status: 400 },
    );
  }

  const productById = new Map(shopProducts.map((p) => [p.id, p]));
  const shopCartItems = typedCartRows.filter((item) => productById.has(item.product_id));

  if (shopCartItems.length === 0) {
    return NextResponse.json(
      { error: "No hay artículos de esta tienda en el carrito." },
      { status: 400 },
    );
  }

  // Resolve first active variant per product
  const shopProductIds = shopCartItems.map((item) => item.product_id);
  const { data: variantRows } = await adminClient
    .from("product_variants")
    .select("id,product_id")
    .in("product_id", shopProductIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const firstVariantIdByProductId = ((variantRows ?? []) as VariantRow[]).reduce(
    (map, row) => {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, row.id);
      }
      return map;
    },
    new Map<string, string>(),
  );

  // Calculate subtotal
  const subtotal = shopCartItems.reduce((total, item) => {
    const product = productById.get(item.product_id);
    return total + (product ? Number(product.price_usd) * item.quantity : 0);
  }, 0);

  // Create order
  const { data: orderRow, error: createOrderError } = await supabase
    .from("orders")
    .insert({
      profile_id: user.id,
      status: "pending",
      payment_method: "ath_movil",
      subtotal_usd: subtotal,
      total_usd: subtotal,
    })
    .select("id")
    .single();

  if (createOrderError || !orderRow) {
    return NextResponse.json(
      { error: createOrderError?.message ?? "No se pudo crear la orden." },
      { status: 500 },
    );
  }

  const orderId = orderRow.id as string;

  // Insert order items
  const { error: orderItemsError } = await supabase.from("order_items").insert(
    shopCartItems.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      product_variant_id: firstVariantIdByProductId.get(item.product_id) ?? null,
      quantity: item.quantity,
      unit_price_usd: Number(productById.get(item.product_id)?.price_usd ?? 0),
    })),
  );

  if (orderItemsError) {
    // Attempt rollback
    await supabase.from("orders").delete().eq("id", orderId).eq("profile_id", user.id);
    return NextResponse.json(
      { error: "No se pudo registrar los artículos de la orden." },
      { status: 500 },
    );
  }

  // Clear cart items for this shop
  const cartItemIds = shopCartItems.map((item) => item.id);
  await supabase.from("cart_items").delete().eq("profile_id", user.id).in("id", cartItemIds);

  // Send vendor email notification (fire and forget)
  const { data: vendorProfileData } = await adminClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", shop.vendor_profile_id)
    .maybeSingle();

  const vendorProfile = vendorProfileData as ProfileRow | null;

  const { data: buyerProfileData } = await adminClient
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", user.id)
    .maybeSingle();

  const buyerProfile = buyerProfileData as ProfileRow | null;

  const emailItems = shopCartItems.map((item) => {
    const product = productById.get(item.product_id);
    return {
      name: product?.name ?? "Producto",
      quantity: item.quantity,
      unitPriceUsd: Number(product?.price_usd ?? 0),
    };
  });

  if (vendorProfile?.email) {
    void sendVendorNewOrderEmail({
      to: vendorProfile.email,
      vendorName: shop.vendor_name,
      orderId,
      buyerEmail: buyerProfile?.email ?? null,
      buyerName: buyerProfile?.full_name ?? null,
      items: emailItems,
      totalUsd: subtotal,
      athMovilPhone: shop.ath_movil_phone,
    });
  }

  if (buyerProfile?.email) {
    void sendBuyerOrderConfirmationEmail({
      to: buyerProfile.email,
      buyerName: buyerProfile.full_name ?? null,
      orderId,
      shopName: shop.vendor_name,
      items: emailItems,
      totalUsd: subtotal,
      athMovilPhone: shop.ath_movil_phone,
    });
  }

  return NextResponse.json({
    ok: true,
    orderId,
    athMovilPhone: shop.ath_movil_phone,
    totalUsd: subtotal,
  });
}
