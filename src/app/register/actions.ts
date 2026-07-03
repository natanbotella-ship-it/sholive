"use server";

import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "./schema";

export type RegisterState = {
  error?: string;
  success?: boolean;
  emailConfirmationRequired?: boolean;
};

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    ageConfirmed: formData.get("ageConfirmed") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const { email, password, role, ageConfirmed } = parsed.data;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        age_confirmed: role === "creator" ? ageConfirmed : false,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    emailConfirmationRequired: !data.session,
  };
}
