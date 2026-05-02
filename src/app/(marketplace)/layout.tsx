import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { SiteFooter } from "@/components/marketplace/site-footer";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:flex">
      <DesktopSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-60">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
