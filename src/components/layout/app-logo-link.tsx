import Link from "next/link";

import { cn } from "@/lib/utils";

type AppLogoLinkProps = {
  className?: string;
};

export function AppLogoLink({ className }: AppLogoLinkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "font-[family-name:var(--font-app-logo)] text-lg font-bold tracking-tight text-[var(--color-carbon)]",
        className,
      )}
    >
      mitienditapr
    </Link>
  );
}
