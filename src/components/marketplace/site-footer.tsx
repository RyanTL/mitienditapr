import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border/60 px-5 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Mitiendita PR</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terminos" className="hover:text-foreground">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
          <Link href="/devoluciones" className="hover:text-foreground">
            Devoluciones
          </Link>
          <a
            href="mailto:hola@mitienditapr.com"
            className="hover:text-foreground"
          >
            Contacto
          </a>
        </nav>
      </div>
    </footer>
  );
}
