import Link from "next/link";
import type { ReactNode } from "react";

import { VendorBottomNav } from "@/components/vendor/vendor-bottom-nav";
import { VendorDesktopNav } from "@/components/vendor/vendor-desktop-nav";

type VendorPageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Render action slot inline with the title (e.g. a status badge or CTA) */
  titleAction?: ReactNode;
};

export function VendorPageShell({ title, subtitle, titleAction, children }: VendorPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--vendor-page-bg)] text-[var(--color-carbon)]">
      <VendorDesktopNav />

      <div className="px-4 pb-28 pt-6 md:px-6 md:pb-10 md:pt-8">
        <main className="mx-auto w-full max-w-lg md:max-w-4xl lg:max-w-6xl">
          <header className="mb-6">
            {/* Marketplace back link — mobile only */}
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--vendor-nav-text)] transition-colors hover:text-[var(--color-carbon)] md:hidden"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Volver
            </Link>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">{title}</h1>
              {titleAction ? <div className="shrink-0">{titleAction}</div> : null}
            </div>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--vendor-nav-text)]">{subtitle}</p>
            ) : null}
          </header>

          <section className="space-y-5">{children}</section>
        </main>
      </div>

      <VendorBottomNav />
    </div>
  );
}
