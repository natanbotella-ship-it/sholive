"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "creator") {
    return { error: "Accès réservé aux comptes créateur" };
  }

  const { username, avatar } = parsed.data;

  let avatarUrl: string | null = null;

  if (avatar && avatar.size > 0) {
    const extension = avatar.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${extension}`;

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
    user_id: user.id,
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
