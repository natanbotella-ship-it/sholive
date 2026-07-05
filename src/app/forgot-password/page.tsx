import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">Mot de passe oublié</h1>
      <ForgotPasswordForm />
    </main>
  );
}
