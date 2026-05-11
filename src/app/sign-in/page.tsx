import { SignInForm } from "@/app/sign-in/sign-in-form";
import { normalizeSafeAppPath } from "@/lib/utils";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

function errorToMessage(code: string | undefined): string | null {
  switch (code) {
    case "verification":
      return "No pudimos verificar tu cuenta. El enlace puede haber expirado o ya fue usado. Intenta iniciar sesión o crea una cuenta nueva.";
    default:
      return null;
  }
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, error } = await searchParams;
  const nextPath = normalizeSafeAppPath(next);
  const initialError = errorToMessage(error);

  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-8 md:flex md:items-center md:justify-center md:px-6">
      <main className="mx-auto w-full max-w-sm rounded-[1.75rem] bg-[var(--color-white-95)] p-5 shadow-[0_18px_36px_var(--shadow-black-012)] backdrop-blur-sm md:max-w-md md:p-6">
        <h1 className="text-2xl font-bold text-[var(--color-carbon)]">Iniciar sesión</h1>
        <p className="mt-1 mb-5 text-sm text-[var(--color-carbon)]">
          Accede a tus favoritos, carrito y órdenes.
        </p>
        <SignInForm nextPath={nextPath} initialError={initialError} />
      </main>
    </div>
  );
}
