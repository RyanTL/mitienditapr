import { redirect } from "next/navigation";

import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorAnalytics,
  getVendorRequestContext,
  getVendorShopByProfileId,
  getVendorOnboardingByProfileId,
} from "@/lib/supabase/vendor-server";
import { formatUsd } from "@/lib/formatters";

const STATUS_LABELS: Record<string, string> = {
  new: "Nueva",
  processing: "Procesando",
  shipped: "Enviada",
  delivered: "Entregada",
  canceled: "Cancelada",
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

  const onboarding = await getVendorOnboardingByProfileId(dataClient, context.userId);
  if (!onboarding || onboarding.status !== "completed") {
    redirect("/vendedor/onboarding");
  }

  const shop = await getVendorShopByProfileId(dataClient, context.userId);
  if (!shop) {
    redirect("/vendedor/onboarding");
  }

  const analytics = await getVendorAnalytics(dataClient, shop.id);

  return (
    <VendorPageShell
      title="Analiticas"
      subtitle="Resumen de ventas y productos de tu tienda."
    >
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <h2 className="text-base font-bold">Resumen de ventas</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--color-gray)] p-3">
              <p className="text-xs text-[var(--color-gray-500)]">Ingresos totales</p>
              <p className="mt-1 text-sm font-semibold">
                {formatUsd(analytics.totalRevenueUsd)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-gray)] p-3">
              <p className="text-xs text-[var(--color-gray-500)]">Ordenes completadas</p>
              <p className="mt-1 text-sm font-semibold">{analytics.orderCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-gray)] p-3">
              <p className="text-xs text-[var(--color-gray-500)]">Promedio por orden</p>
              <p className="mt-1 text-sm font-semibold">
                {formatUsd(analytics.avgOrderValueUsd)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-gray)] p-3">
              <p className="text-xs text-[var(--color-gray-500)]">Ultimos 30 dias</p>
              <p className="mt-1 text-sm font-semibold">
                {formatUsd(analytics.revenueLastThirtyDaysUsd)}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <h2 className="text-base font-bold">Ordenes por estado</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {STATUS_ORDER.map((status) => {
              const count = analytics.ordersByStatus[status] ?? 0;
              return (
                <div key={status} className="rounded-2xl border border-[var(--color-gray)] p-3">
                  <p className="text-xs text-[var(--color-gray-500)]">
                    {STATUS_LABELS[status] ?? status}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{count}</p>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Top productos</h2>
        {analytics.topProducts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-gray-500)]">
            Aun no hay ventas registradas.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {analytics.topProducts.map((product, index) => (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-gray)] p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-gray)] text-xs font-bold text-[var(--color-gray-500)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="text-xs text-[var(--color-gray-500)]">
                    {product.unitsSold} {product.unitsSold === 1 ? "unidad" : "unidades"} vendidas
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {formatUsd(product.revenueUsd)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </article>
    </VendorPageShell>
  );
}
