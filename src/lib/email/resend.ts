import { Resend } from "resend";

import { formatUsd } from "@/lib/formatters";
import type { VendorOrderStatus } from "@/lib/vendor/constants";

type OrderItem = {
  name: string;
  quantity: number;
  unitPriceUsd: number;
};

type VendorNewOrderEmailInput = {
  to: string;
  vendorName: string;
  orderId: string;
  buyerEmail: string | null;
  buyerName: string | null;
  items: OrderItem[];
  totalUsd: number;
  athMovilPhone: string;
};

type WelcomeEmailInput = {
  to: string;
  name: string | null;
};

type BuyerOrderConfirmationEmailInput = {
  to: string;
  buyerName: string | null;
  orderId: string;
  shopName: string;
  items: OrderItem[];
  totalUsd: number;
  athMovilPhone: string;
};

type BuyerOrderStatusEmailInput = {
  to: string;
  buyerName: string | null;
  orderId: string;
  shopName: string;
  newStatus: Extract<VendorOrderStatus, "processing" | "shipped" | "delivered" | "canceled">;
};

type VendorOrderCancelledEmailInput = {
  to: string;
  vendorName: string;
  orderId: string;
  buyerName: string | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mitienditapr.com";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email.");
    return null;
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "notificaciones@mitienditapr.com";
}

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          ${content}
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">Mitiendita PR — El mercado local de Puerto Rico</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailHeader(title: string, subtitle: string): string {
  return `
  <tr>
    <td style="background:#1a1a1a;padding:28px 32px;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Mitiendita PR</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${title}</h1>
      ${subtitle ? `<p style="margin:6px 0 0;color:#aaa;font-size:14px;">${subtitle}</p>` : ""}
    </td>
  </tr>`;
}

function buildOrderItemsRows(items: OrderItem[]): string {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatUsd(item.unitPriceUsd)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatUsd(item.unitPriceUsd * item.quantity)}</td>
        </tr>`,
    )
    .join("");
}

// ─── Vendor: New Order ────────────────────────────────────────────────────────

function buildVendorNewOrderHtml(input: VendorNewOrderEmailInput): string {
  const { vendorName, orderId, buyerEmail, buyerName, items, totalUsd, athMovilPhone } = input;
  const buyerDisplay = buyerName ?? "Comprador anónimo";
  const buyerEmailDisplay = buyerEmail ?? "Sin email";
  const shortOrderId = orderId.slice(0, 8).toUpperCase();

  return emailWrapper(`
    ${emailHeader("Nueva orden recibida", "")}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 8px;color:#555;font-size:14px;">Tienda</p>
        <p style="margin:0 0 24px;color:#1a1a1a;font-size:17px;font-weight:700;">${vendorName}</p>

        <p style="margin:0 0 4px;color:#555;font-size:13px;">Número de orden</p>
        <p style="margin:0 0 24px;font-family:monospace;font-size:14px;background:#f5f5f5;display:inline-block;padding:6px 12px;border-radius:8px;color:#1a1a1a;">#${shortOrderId}</p>

        <p style="margin:0 0 4px;color:#555;font-size:13px;">Pago recibido vía</p>
        <p style="margin:0 0 24px;color:#1a1a1a;font-size:15px;font-weight:600;">ATH Móvil · ${athMovilPhone}</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f8f8f8;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Producto</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Precio</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${buildOrderItemsRows(items)}</tbody>
        </table>

        <div style="text-align:right;margin-bottom:24px;">
          <span style="font-size:18px;font-weight:700;color:#1a1a1a;">Total: ${formatUsd(totalUsd)}</span>
        </div>

        <div style="background:#f8f8f8;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Comprador</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a;">${buyerDisplay}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#555;">${buyerEmailDisplay}</p>
        </div>

        <a href="${APP_URL}/vendedor/pedidos"
          style="display:block;text-align:center;background:#1a1a1a;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
          Ver orden en mi panel
        </a>
      </td>
    </tr>
  `);
}

export async function sendVendorNewOrderEmail(input: VendorNewOrderEmailInput): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  try {
    await resend.emails.send({
      from: `Mitiendita PR <${getFromEmail()}>`,
      to: input.to,
      subject: `Nueva orden #${shortOrderId} en ${input.vendorName} — Mitiendita PR`,
      html: buildVendorNewOrderHtml(input),
    });
  } catch (error) {
    console.error("[email] Failed to send vendor order notification:", error);
  }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

function buildWelcomeHtml(input: WelcomeEmailInput): string {
  const greeting = input.name ? `¡Hola, ${input.name}!` : "¡Bienvenido/a!";
  return emailWrapper(`
    ${emailHeader("¡Bienvenido/a a Mitiendita PR!", "")}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;color:#1a1a1a;font-size:17px;font-weight:600;">${greeting}</p>
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          Tu cuenta ha sido creada exitosamente. Ya puedes explorar tiendas locales de Puerto Rico y hacer tus compras.
        </p>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
          Descubre productos únicos de vendedores locales directamente desde tu teléfono.
        </p>

        <a href="${APP_URL}"
          style="display:block;text-align:center;background:#1a1a1a;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:24px;">
          Explorar tiendas
        </a>
      </td>
    </tr>
  `);
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: `Mitiendita PR <${getFromEmail()}>`,
      to: input.to,
      subject: "¡Bienvenido/a a Mitiendita PR!",
      html: buildWelcomeHtml(input),
    });
  } catch (error) {
    console.error("[email] Failed to send welcome email:", error);
  }
}

// ─── Buyer: Order Confirmation ────────────────────────────────────────────────

function buildBuyerOrderConfirmationHtml(input: BuyerOrderConfirmationEmailInput): string {
  const { buyerName, orderId, shopName, items, totalUsd, athMovilPhone } = input;
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const greeting = buyerName ? `¡Hola, ${buyerName}!` : "¡Hola!";

  return emailWrapper(`
    ${emailHeader("Orden recibida", shopName)}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;">${greeting} Tu orden ha sido recibida.</p>

        <p style="margin:0 0 4px;color:#555;font-size:13px;">Número de orden</p>
        <p style="margin:0 0 24px;font-family:monospace;font-size:14px;background:#f5f5f5;display:inline-block;padding:6px 12px;border-radius:8px;color:#1a1a1a;">#${shortOrderId}</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f8f8f8;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Producto</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Cant.</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Precio</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
            </tr>
          </thead>
          <tbody>${buildOrderItemsRows(items)}</tbody>
        </table>

        <div style="text-align:right;margin-bottom:24px;">
          <span style="font-size:18px;font-weight:700;color:#1a1a1a;">Total: ${formatUsd(totalUsd)}</span>
        </div>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Cómo pagar</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;">Envía <strong>${formatUsd(totalUsd)}</strong> por ATH Móvil al número <strong>${athMovilPhone}</strong> para confirmar tu orden.</p>
        </div>

        <a href="${APP_URL}/ordenes"
          style="display:block;text-align:center;background:#1a1a1a;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
          Ver mis órdenes
        </a>
      </td>
    </tr>
  `);
}

export async function sendBuyerOrderConfirmationEmail(
  input: BuyerOrderConfirmationEmailInput,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  try {
    await resend.emails.send({
      from: `Mitiendita PR <${getFromEmail()}>`,
      to: input.to,
      subject: `Orden #${shortOrderId} recibida en ${input.shopName} — Mitiendita PR`,
      html: buildBuyerOrderConfirmationHtml(input),
    });
  } catch (error) {
    console.error("[email] Failed to send buyer order confirmation:", error);
  }
}

// ─── Buyer: Order Status Update ───────────────────────────────────────────────

const STATUS_LABELS: Record<BuyerOrderStatusEmailInput["newStatus"], string> = {
  processing: "En preparación",
  shipped: "En camino",
  delivered: "Entregada",
  canceled: "Cancelada por la tienda",
};

const STATUS_DESCRIPTIONS: Record<BuyerOrderStatusEmailInput["newStatus"], string> = {
  processing: "La tienda está preparando tu orden.",
  shipped: "Tu orden está en camino. Pronto la recibirás.",
  delivered: "Tu orden fue marcada como entregada.",
  canceled: "La tienda canceló tu orden. Si tienes preguntas, contacta directamente a la tienda.",
};

function buildBuyerOrderStatusHtml(input: BuyerOrderStatusEmailInput): string {
  const { buyerName, orderId, shopName, newStatus } = input;
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const greeting = buyerName ? `¡Hola, ${buyerName}!` : "¡Hola!";
  const label = STATUS_LABELS[newStatus];
  const description = STATUS_DESCRIPTIONS[newStatus];

  return emailWrapper(`
    ${emailHeader(`Orden #${shortOrderId}: ${label}`, shopName)}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;">${greeting}</p>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">${description}</p>

        <div style="background:#f5f5f5;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Estado de la orden</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#1a1a1a;">${label}</p>
          <p style="margin:4px 0 0;font-family:monospace;font-size:13px;color:#555;">#${shortOrderId} · ${shopName}</p>
        </div>

        <a href="${APP_URL}/ordenes"
          style="display:block;text-align:center;background:#1a1a1a;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
          Ver mis órdenes
        </a>
      </td>
    </tr>
  `);
}

export async function sendBuyerOrderStatusEmail(
  input: BuyerOrderStatusEmailInput,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const label = STATUS_LABELS[input.newStatus];
  try {
    await resend.emails.send({
      from: `Mitiendita PR <${getFromEmail()}>`,
      to: input.to,
      subject: `Orden #${shortOrderId}: ${label} — Mitiendita PR`,
      html: buildBuyerOrderStatusHtml(input),
    });
  } catch (error) {
    console.error("[email] Failed to send buyer order status update:", error);
  }
}

// ─── Vendor: Buyer Cancelled Order ───────────────────────────────────────────

function buildVendorOrderCancelledHtml(input: VendorOrderCancelledEmailInput): string {
  const { vendorName, orderId, buyerName } = input;
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const buyerDisplay = buyerName ?? "El comprador";

  return emailWrapper(`
    ${emailHeader("Orden cancelada por el comprador", "")}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;">Hola, ${vendorName}.</p>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
          ${buyerDisplay} canceló su orden. No es necesario que hagas nada.
        </p>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;letter-spacing:0.05em;">Orden cancelada</p>
          <p style="margin:0;font-family:monospace;font-size:14px;color:#1a1a1a;">#${shortOrderId}</p>
          ${buyerName ? `<p style="margin:4px 0 0;font-size:14px;color:#555;">Comprador: ${buyerName}</p>` : ""}
        </div>

        <a href="${APP_URL}/vendedor/pedidos"
          style="display:block;text-align:center;background:#1a1a1a;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
          Ver órdenes en mi panel
        </a>
      </td>
    </tr>
  `);
}

export async function sendVendorOrderCancelledEmail(
  input: VendorOrderCancelledEmailInput,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  try {
    await resend.emails.send({
      from: `Mitiendita PR <${getFromEmail()}>`,
      to: input.to,
      subject: `Orden #${shortOrderId} cancelada por el comprador — Mitiendita PR`,
      html: buildVendorOrderCancelledHtml(input),
    });
  } catch (error) {
    console.error("[email] Failed to send vendor order cancelled notification:", error);
  }
}
