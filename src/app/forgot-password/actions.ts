"use server";

import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "./schema";

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl}/auth/confirm?next=/reset-password` },
  );

  if (error) {
    return { error: error.message };
  }

  // Toujours succes, meme si l'email n'existe pas (evite l'enumeration de comptes).
  return { success: true };
}
