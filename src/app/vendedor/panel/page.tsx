import Link from "next/link";
import { redirect } from "next/navigation";

import { VendorShopShareAction } from "@/components/share/vendor-shop-share-action";
import { VendorPageShell } from "@/components/vendor/vendor-page-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getVendorRequestContext,
  getVendorStatusSnapshot,
} from "@/lib/supabase/vendor-server";

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "No configurado";
  }

  const mapping: Record<string, string> = {
    active: "Activa",
    trialing: "Activa",
    past_due: "Pago atrasado",
    unpaid: "Impaga",
    canceled: "Cancelada",
    inactive: "Inactiva",
    draft: "Borrador",
    paused: "Pausada",
    completed: "Completado",
    in_progress: "En progreso",
  };

  return mapping[value] ?? value;
}

export default async function VendorPanelPage() {
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

  if (!snapshot.onboarding || snapshot.onboarding.status !== "completed") {
    redirect("/vendedor/onboarding");
  }

  return (
    <VendorPageShell
      title="Panel de vendedor"
      subtitle="Resumen rapido de tu tienda y acciones clave."
    >
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Estado de tienda</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--color-gray)] p-3">
            <p className="text-xs text-[var(--color-gray-500)]">Tienda</p>
            <p className="mt-1 text-sm font-semibold">
              {formatStatusLabel(snapshot.shop?.status)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-gray)] p-3">
            <p className="text-xs text-[var(--color-gray-500)]">Suscripcion</p>
            <p className="mt-1 text-sm font-semibold">
              {formatStatusLabel(snapshot.subscription?.status)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-gray)] p-3">
            <p className="text-xs text-[var(--color-gray-500)]">Productos activos</p>
            <p className="mt-1 text-sm font-semibold">{snapshot.metrics.productCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-gray)] p-3">
            <p className="text-xs text-[var(--color-gray-500)]">Ordenes</p>
            <p className="mt-1 text-sm font-semibold">{snapshot.metrics.orderCount}</p>
          </div>
        </div>
      </article>

      <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
        <h2 className="text-base font-bold">Acciones rapidas</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/vendedor/productos"
            className="rounded-2xl border border-[var(--color-gray)] px-3 py-2 text-sm font-semibold"
          >
            Gestionar productos
          </Link>
          <Link
            href="/vendedor/pedidos"
            className="rounded-2xl border border-[var(--color-gray)] px-3 py-2 text-sm font-semibold"
          >
            Revisar pedidos
          </Link>
          <Link
            href="/vendedor/tienda"
            className="rounded-2xl border border-[var(--color-gray)] px-3 py-2 text-sm font-semibold"
          >
            Ajustar tienda
          </Link>
          <Link
            href={`/${snapshot.shop?.slug ?? ""}`}
            className="rounded-2xl border border-[var(--color-gray)] px-3 py-2 text-sm font-semibold"
          >
            Ver tienda publica
          </Link>
          <VendorShopShareAction />
        </div>
      </article>
      </div>

      {snapshot.checks.blockingReasons.length > 0 ? (
        <article className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[0_10px_20px_var(--shadow-black-008)]">
          <h2 className="text-base font-bold">Checklist de publicacion</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-danger)]">
            {snapshot.checks.blockingReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </article>
      ) : null}
    </VendorPageShell>
  );
}
