import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">
        Réinitialiser le mot de passe
      </h1>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <p className="max-w-sm alert-error">
          Lien invalide ou expiré. Redemande un lien depuis{" "}
          <a href="/forgot-password" className="link">
            mot de passe oublié
          </a>
          .
        </p>
      )}
    </main>
  );
}
