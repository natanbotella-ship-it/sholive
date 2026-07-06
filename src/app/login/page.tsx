import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Connexion
            </h1>
            <p className="text-sm text-muted">
              Content de te revoir sur Sholive.
            </p>
          </div>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link href="/register" className="link">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
