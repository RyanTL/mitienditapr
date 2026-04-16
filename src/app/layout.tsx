import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const appLogoFont = Rethink_Sans({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-app-logo",
});

export const metadata: Metadata = {
  title: "Mitiendita PR",
  description: "Marketplace para descubrir y comprar en tiendas locales.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={appLogoFont.variable}>
      <body className="antialiased">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
