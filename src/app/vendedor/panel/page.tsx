import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ChevronIcon,
  OrdersIcon,
  PackageIcon,
  PlusIcon,
  SettingsIcon,
} from "@/components/icons";
import { VendorShopShareAction } from "@/components/share/vendor-shop-share-action";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import { formatUsd } from "@/lib/formatters";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorAnalytics,
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

type VendorPanelPageProps = {
  searchParams: Promise<{
    welcome?: string;
  }>;
};

export default async function VendorPanelPage({ searchParams }: VendorPanelPageProps) {
  const { welcome } = await searchParams;
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/panel");
  }

  let dataClient = context.supabase;
  try {
    dataClient = createSupabaseAdminClient();
  } catch {
    // Secret key is optional in development.
  }

  const snapshot = await getVendorStatusSnapshot({
    ...context,
    supabase: dataClient,
  });

  const isOnboardingDone = snapshot.onboarding?.status === "completed";

  if (!isOnboardingDone) {
    redirect("/vendedor/onboarding");
  }

  const analytics = snapshot.shop
    ? await getVendorAnalytics(dataClient, snapshot.shop.id).catch(() => null)
    : null;

  const shopName = snapshot.shop?.vendor_name ?? "Tu tienda";
  const newOrderCount = snapshot.metrics.newOrderCount;
  const productCount = snapshot.metrics.productCount;
  const orderCount = snapshot.metrics.orderCount;
  const revenueThirtyDays = analytics?.revenueLastThirtyDaysUsd ?? 0;
  const totalRevenue = analytics?.totalRevenueUsd ?? 0;
  const avgOrderValue = analytics?.avgOrderValueUsd ?? 0;
  const isSubscribed =
    snapshot.subscription?.status === "active" ||
    snapshot.subscription?.status === "trialing";
  const showWelcomeBanner = welcome === "onboarding-complete" || welcome === "vendor-activated";
  return (
    <VendorPageShell
      title={shopName}
      titleAction={<VendorShopShareAction />}
    >
      {showWelcomeBanner && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[var(--color-carbon)]">
          <p className="text-sm font-semibold text-emerald-900">
            {welcome === "vendor-activated" ? "Tu suscripción está activa" : "Tu tienda está lista"}
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">
            {welcome === "vendor-activated"
              ? "Tu cuenta de vendedor ya está lista. Ya puedes listar productos ilimitados."
              : "Tus políticas generales ya están listas. Agrega productos y publicaremos tu tienda automáticamente cuando esté lista para vender."}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/vendedor/productos"
              className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Listar productos
            </Link>
            <Link
              href="/vendedor/tienda"
              className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              Configurar tienda
            </Link>
          </div>
        </div>
      )}

      {/* Persistent next-step nudge for vendors who haven't listed a product yet. */}
      {productCount === 0 && (
        <Link
          href="/vendedor/productos"
          className="group block rounded-2xl border border-[var(--color-brand)]/30 bg-white p-4 shadow-[var(--vendor-card-shadow)] transition-shadow hover:shadow-[var(--vendor-card-shadow-hover)]"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
            >
              <PackageIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand)]">
                Primer paso
              </p>
              <p className="mt-0.5 text-sm font-bold text-[var(--color-carbon)]">
                Lista tu primer producto
              </p>
              <p className="mt-1 text-xs leading-snug text-[var(--vendor-nav-text)]">
                Tu tienda necesita al menos un producto activo para poder publicarse.
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-4 py-2 text-xs font-semibold text-white transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]">
            Agregar producto
          </span>
        </Link>
      )}

      {/* Upgrade card for free-tier vendors */}
      {!isSubscribed && !snapshot.billingBypassEnabled && (
        <Link
          href="/vendedor/suscripcion"
          className="group block rounded-2xl border border-[var(--vendor-card-border)] bg-white p-4 shadow-[var(--vendor-card-shadow)] transition-shadow hover:shadow-[var(--vendor-card-shadow-hover)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-carbon)]">
                Plan Gratuito
              </p>
              <p className="mt-1 text-xs text-[var(--color-gray-500)]">
                Hasta 4 productos &middot; 2 fotos por producto
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]">
              Mejorar a $10/mes
            </span>
          </div>
                   <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--vendor-card-border)] pt-3 text-[11px] text-[var(--color-gray-500)]">
            <span>Productos ilimitados</span>
            <span>&middot;</span>
            <span>Hasta 20 fotos por producto</span>
            <span>&middot;</span>
            <span>Código QR</span>
            <span>&middot;</span>
            <span>Soporte rápido</span>
          </div>
        </Link>
      )}

      {/* New orders alert */}
      {newOrderCount > 0 && (
        <Link
          href="/vendedor/pedidos"
          className="group flex items-center gap-3 rounded-2xl border border-[var(--vendor-card-border)] bg-white p-4 shadow-[var(--vendor-card-shadow)] transition-shadow hover:shadow-[var(--vendor-card-shadow-hover)]"
        >
          <span className="shrink-0 text-[var(--color-gray-500)]">
            <OrdersIcon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="text-sm font-semibold text-[var(--color-carbon)]">
              {newOrderCount} {newOrderCount === 1 ? "pedido nuevo" : "pedidos nuevos"}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--vendor-nav-text)]">Toca para revisar</span>
          </span>
          <ChevronIcon className="h-4 w-4 text-[var(--vendor-nav-text)] transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Revenue hero card */}
      <div className="rounded-2xl border border-[var(--vendor-card-border)] bg-white p-5 shadow-[var(--vendor-card-shadow)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vendor-nav-text)]">
          Ingresos — últimos 30 días
        </p>
        <p className="mt-3 font-[family-name:var(--font-mono)] text-4xl font-bold tabular-nums tracking-tight text-[var(--color-carbon)]">
          {formatUsd(revenueThirtyDays)}
        </p>
        {analytics && analytics.orderCount > 0 && (
          <div className="mt-3 flex items-center gap-4 border-t border-[var(--vendor-card-border)] pt-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vendor-nav-text)]">Total</p>
              <p className="mt-0.5 font-[family-name:var(--font-mono)] text-sm font-semibold tabular-nums">
                {formatUsd(totalRevenue)}
              </p>
            </div>
            <div className="h-8 w-px bg-[var(--vendor-card-border)]" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vendor-nav-text)]">Promedio</p>
              <p className="mt-0.5 font-[family-name:var(--font-mono)] text-sm font-semibold tabular-nums">
                {formatUsd(avgOrderValue)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/vendedor/productos"
          className="group rounded-2xl border border-[var(--vendor-card-border)] bg-white p-4 shadow-[var(--vendor-card-shadow)] transition-shadow hover:shadow-[var(--vendor-card-shadow-hover)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vendor-nav-text)]">
            Productos
          </p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-2xl font-bold tabular-nums text-[var(--color-carbon)]">
            {productCount}
          </p>
          <p className="mt-0.5 text-xs text-[var(--vendor-nav-text)]">activos</p>
        </Link>

        <Link
          href="/vendedor/pedidos"
          className="group rounded-2xl border border-[var(--vendor-card-border)] bg-white p-4 shadow-[var(--vendor-card-shadow)] transition-shadow hover:shadow-[var(--vendor-card-shadow-hover)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vendor-nav-text)]">
            Pedidos
          </p>
          <p className="mt-2 flex items-center gap-2 font-[family-name:var(--font-mono)] text-2xl font-bold tabular-nums text-[var(--color-carbon)]">
            {orderCount}
            {newOrderCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 font-sans text-[10px] font-bold text-white">
                {newOrderCount}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-[var(--vendor-nav-text)]">totales</p>
        </Link>
      </div>

      {/* Quick actions */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--vendor-nav-text)]">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/vendedor/productos", label: "Agregar producto", Icon: PlusIcon },
            { href: "/vendedor/pedidos", label: "Ver pedidos", Icon: OrdersIcon },
            { href: "/vendedor/tienda", label: "Configuración", Icon: SettingsIcon },
          ].map(({ href, label, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-[var(--vendor-card-border)] bg-white px-4 py-3.5 text-[var(--color-carbon)] transition-colors hover:bg-[var(--vendor-page-bg)]"
            >
              <span className="shrink-0 text-[var(--color-gray-500)]">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </VendorPageShell>
  );
}
