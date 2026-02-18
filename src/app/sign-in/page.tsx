import { SignInForm } from "@/app/sign-in/sign-in-form";

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function normalizeNextPath(nextPath: string | undefined) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }
  return nextPath;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  const nextPath = normalizeNextPath(next);

  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-8">
      <main className="mx-auto w-full max-w-sm rounded-3xl border border-[var(--color-gray-border)] bg-[var(--color-white)] p-5 shadow-[0_14px_30px_var(--shadow-black-012)]">
        <h1 className="text-2xl font-bold text-[var(--color-carbon)]">Iniciar sesion</h1>
        <p className="mt-1 mb-5 text-sm text-[var(--color-carbon)]">
          Accede a tus favoritos, carrito y ordenes.
        </p>
        <SignInForm nextPath={nextPath} />
      </main>
    </div>
  );
}
