import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-warm-page)] px-4 text-center">
      <p className="text-7xl font-extrabold text-[var(--color-carbon)]">404</p>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-carbon)]">
        Página no encontrada
      </h1>
      <p className="mt-2 text-sm text-[var(--color-gray-500)]">
        Lo que buscas no existe o fue movido.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[var(--color-carbon)] px-6 py-3 text-sm font-semibold text-[var(--color-white)]"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
