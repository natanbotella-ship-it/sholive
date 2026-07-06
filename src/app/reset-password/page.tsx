import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Nouveau mot de passe
            </h1>
            <p className="text-sm text-muted">
              Choisis un nouveau mot de passe pour ton compte.
            </p>
          </div>
          {user ? (
            <ResetPasswordForm />
          ) : (
            <p className="alert-error">
              Lien invalide ou expiré. Redemande un lien depuis{" "}
              <a href="/forgot-password" className="link">
                mot de passe oublié
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
