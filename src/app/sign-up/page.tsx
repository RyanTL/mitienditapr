import { SignUpForm } from "@/app/sign-up/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[var(--color-gray)] px-4 py-8">
      <main className="mx-auto w-full max-w-sm rounded-3xl border border-[var(--color-gray-border)] bg-[var(--color-white)] p-5 shadow-[0_14px_30px_var(--shadow-black-012)]">
        <h1 className="text-2xl font-bold text-[var(--color-carbon)]">Crear cuenta</h1>
        <p className="mt-1 mb-5 text-sm text-[var(--color-carbon)]">
          Crea tu cuenta para guardar productos y comprar.
        </p>
        <SignUpForm />
      </main>
    </div>
  );
}
