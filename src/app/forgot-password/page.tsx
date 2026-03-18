import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-8 md:flex md:items-center md:justify-center md:px-6">
      <main className="mx-auto w-full max-w-sm rounded-[1.75rem] bg-[var(--color-white-95)] p-5 shadow-[0_18px_36px_var(--shadow-black-012)] backdrop-blur-sm md:max-w-md md:p-6">
        <h1 className="text-2xl font-bold text-[var(--color-carbon)]">Olvidaste tu contraseña</h1>
        <p className="mt-1 mb-5 text-sm text-[var(--color-carbon)]">
          Ingresa tu email y te enviaremos un enlace para restablecerla.
        </p>
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
