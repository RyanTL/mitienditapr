import { Suspense } from "react";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { AuthFeedbackToast } from "@/components/marketplace/auth-feedback-toast";
import { SiteFooter } from "@/components/marketplace/site-footer";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:flex">
      <Suspense fallback={null}>
        <AuthFeedbackToast />
      </Suspense>
      <DesktopSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-60">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
