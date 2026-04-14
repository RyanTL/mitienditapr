import { redirect } from "next/navigation";

import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorAnalytics,
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";
import { formatUsd } from "@/lib/formatters";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "Nueva", color: "var(--vendor-status-new)" },
  processing: { label: "Procesando", color: "var(--vendor-status-processing)" },
  shipped: { label: "Enviada", color: "var(--vendor-status-shipped)" },
  delivered: { label: "Entregada", color: "var(--vendor-status-delivered)" },
  canceled: { label: "Cancelada", color: "var(--vendor-status-canceled)" },
};

const STATUS_ORDER = ["new", "processing", "shipped", "delivered", "canceled"];

export default async function VendorAnaliticasPage() {
  const context = await getVendorRequestContext();
  if (!context) {
    redirect("/sign-in?next=/vendedor/analiticas");
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

  if (!isOnboardingDone || !snapshot.shop) {
    redirect("/vendedor/onboarding");
  }

  const shop = snapshot.shop;

  const analytics = await getVendorAnalytics(dataClient, shop.id);

  return (
    <VendorPageShell
      title="Analíticas"
      subtitle="Rendimiento de tu tienda"
    >
      {/* Revenue hero */}
      <div className="rounded-2xl border border-[var(--vendor-card-border)] bg-white p-5 shadow-[var(--vendor-card-shadow)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vendor-nav-text)]">
          Ingresos totales
        </p>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-4xl font-bold tabular-nums tracking-tight text-[var(--color-carbon)]">
          {formatUsd(analytics.totalRevenueUsd)}
        </p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--vendor-card-border)] border-t border-[var(--vendor-card-border)] pt-4">
          <div className="pr-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vendor-nav-text)]">
              Órdenes
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-semibold tabular-nums">
              {analytics.orderCount}
            </p>
          </div>
          <div className="px-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vendor-nav-text)]">
              Promedio
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-semibold tabular-nums">
              {formatUsd(analytics.avgOrderValueUsd)}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vendor-nav-text)]">
              30 días
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-semibold tabular-nums">
              {formatUsd(analytics.revenueLastThirtyDaysUsd)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Orders by status */}
        <div className="rounded-2xl border border-[var(--vendor-card-border)] bg-white p-5 shadow-[var(--vendor-card-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--color-carbon)]">Órdenes por estado</h2>
          <div className="mt-4 space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = analytics.ordersByStatus[status] ?? 0;
              const config = STATUS_CONFIG[status];
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: config?.color }}
                    />
                    <span className="text-sm text-[var(--color-carbon)]">
                      {config?.label ?? status}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-sm font-semibold tabular-nums text-[var(--color-carbon)]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-2xl border border-[var(--vendor-card-border)] bg-white p-5 shadow-[var(--vendor-card-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--color-carbon)]">Top productos</h2>
          {analytics.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--vendor-nav-text)]">
              Aún no hay ventas registradas.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-[var(--vendor-card-border)]">
              {analytics.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vendor-page-bg)] font-[family-name:var(--font-mono)] text-xs font-semibold text-[var(--vendor-nav-text)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-carbon)]">{product.name}</p>
                    <p className="text-xs text-[var(--vendor-nav-text)]">
                      {product.unitsSold} {product.unitsSold === 1 ? "unidad" : "unidades"}
                    </p>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-mono)] text-sm font-semibold tabular-nums">
                    {formatUsd(product.revenueUsd)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </VendorPageShell>
  );
}
