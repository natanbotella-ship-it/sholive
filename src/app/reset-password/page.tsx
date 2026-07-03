import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary">
        Réinitialiser le mot de passe
      </h1>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <p className="max-w-sm text-sm text-red-600">
          Lien invalide ou expiré. Redemande un lien depuis{" "}
          <a href="/forgot-password" className="text-primary underline">
            mot de passe oublié
          </a>
          .
        </p>
      )}
    </main>
  );
}
