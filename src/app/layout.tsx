import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mitiendita PR",
  description: "Marketplace para descubrir y comprar en tiendas locales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
