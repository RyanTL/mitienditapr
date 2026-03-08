import { DesktopSidebar } from "@/components/layout/desktop-sidebar";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:flex">
      <DesktopSidebar />
      <div className="min-w-0 flex-1 lg:pl-60">
        {children}
      </div>
    </div>
  );
}
