"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { creatorProfileSchema } from "./schema";

export type CreatorOnboardingState = {
  error?: string;
};

export async function completeCreatorProfileAction(
  _prevState: CreatorOnboardingState,
  formData: FormData,
): Promise<CreatorOnboardingState> {
  const parsed = creatorProfileSchema.safeParse({
    username: formData.get("username"),
    avatar: formData.get("avatar"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = createClient();
  // Rôle vérifié contre profiles.role (user_metadata est forgeable, cf. lib/auth) :
  // c'est ce contrôle qui empêche un compte pro de se créer un profil créateur
  // (et de soumettre à ses propres challenges).
  const auth = await getAuthenticatedUser(supabase);

  if (!auth || auth.role !== "creator") {
    return { error: "Accès réservé aux comptes créateur" };
  }

  const { username, avatar } = parsed.data;

  let avatarUrl: string | null = null;

  if (avatar && avatar.size > 0) {
    const extension = avatar.name.split(".").pop() ?? "jpg";
    const path = `${auth.user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true });

    if (uploadError) {
      return { error: "Impossible d'envoyer l'avatar" };
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    avatarUrl = publicUrlData.publicUrl;
  }

  const { error: profileError } = await supabase.from("creator_profiles").insert({
    user_id: auth.user.id,
    username,
    avatar_url: avatarUrl,
  });

  if (profileError) {
    if (profileError.code === "23505") {
      return { error: "Ce nom d'utilisateur est déjà pris" };
    }
    return { error: "Impossible de créer le profil créateur" };
  }

  redirect("/creator/dashboard");
}
