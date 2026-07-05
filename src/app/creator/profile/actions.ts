"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { creatorProfileSchema } from "../onboarding/schema";

export type UpdateCreatorProfileState = {
  error?: string;
};

export async function updateCreatorProfileAction(
  _prevState: UpdateCreatorProfileState,
  formData: FormData,
): Promise<UpdateCreatorProfileState> {
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

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creatorProfile) {
    return { error: "Profil créateur introuvable" };
  }

  const { username, avatar } = parsed.data;

  let avatarUrl = creatorProfile.avatar_url;

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

  const { error: updateError } = await supabase
    .from("creator_profiles")
    .update({ username, avatar_url: avatarUrl })
    .eq("id", creatorProfile.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Ce nom d'utilisateur est déjà pris" };
    }
    return { error: "Impossible de mettre à jour le profil" };
  }

  redirect("/creator/dashboard");
}
