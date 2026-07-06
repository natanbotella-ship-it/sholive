import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Mot de passe oublié
            </h1>
            <p className="text-sm text-muted">
              Donne-nous ton email, on t&apos;envoie un lien pour en choisir un
              nouveau.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="link">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
