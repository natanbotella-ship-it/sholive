import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const initialRole = searchParams.role === "merchant" ? "merchant" : "creator";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Créer un compte
            </h1>
            <p className="text-sm text-muted">
              Gratuit, en 2 minutes. Choisis ton profil ci-dessous.
            </p>
          </div>
          <RegisterForm initialRole={initialRole} />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="link">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
