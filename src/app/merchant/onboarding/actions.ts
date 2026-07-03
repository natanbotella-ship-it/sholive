"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { merchantProfileSchema } from "./schema";

export type MerchantOnboardingState = {
  error?: string;
};

export async function completeMerchantProfileAction(
  _prevState: MerchantOnboardingState,
  formData: FormData,
): Promise<MerchantOnboardingState> {
  const parsed = merchantProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    city: formData.get("city"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "merchant") {
    return { error: "Accès réservé aux comptes pro" };
  }

  const { businessName, city, phone } = parsed.data;

  const { data: merchantProfile, error: profileError } = await supabase
    .from("merchant_profiles")
    .insert({ user_id: user.id, business_name: businessName, city })
    .select("id")
    .single();

  if (profileError) {
    return { error: "Impossible de créer le profil marchand (déjà existant ?)" };
  }

  const { error: contactError } = await supabase
    .from("merchant_contacts")
    .insert({ merchant_id: merchantProfile.id, phone });

  if (contactError) {
    return { error: "Impossible d'enregistrer le téléphone" };
  }

  redirect("/merchant/dashboard");
}
