import type { ReactNode } from "react";

import { VendorBottomNav } from "@/components/vendor/vendor-bottom-nav";
import { VendorTopNav } from "@/components/vendor/vendor-top-nav";

type VendorPageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function VendorPageShell({ title, subtitle, children }: VendorPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-6 pb-28 text-[var(--color-carbon)] md:px-5">
      <main className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-gray-500)]">
            Mitiendita PR
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-gray-500)]">{subtitle}</p> : null}
        </header>

        <VendorTopNav />

        <section className="space-y-3 md:space-y-4">{children}</section>
      </main>

      <VendorBottomNav />
    </div>
  );
}
