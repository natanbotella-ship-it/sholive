"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { levelForXp } from "@/lib/xp";
import { submissionSchema } from "./schema";

export type SubmissionState = {
  error?: string;
  success?: boolean;
};

export async function submitAction(
  _prevState: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const challengeId = formData.get("challengeId");
  if (typeof challengeId !== "string" || !challengeId) {
    return { error: "Challenge introuvable" };
  }

  const parsed = submissionSchema.safeParse({
    tiktokUrl: formData.get("tiktokUrl"),
    reelsUrl: formData.get("reelsUrl"),
    shortsUrl: formData.get("shortsUrl"),
    views: formData.get("views"),
    saves: formData.get("saves"),
    likes: formData.get("likes"),
    shares: formData.get("shares"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = createClient();
  // Rôle vérifié contre profiles.role (user_metadata est forgeable, cf. lib/auth).
  const auth = await getAuthenticatedUser(supabase);

  if (!auth || auth.role !== "creator") {
    return { error: "Accès réservé aux comptes créateur" };
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, status, submission_deadline")
    .eq("id", challengeId)
    .single();

  if (!challenge) {
    return { error: "Challenge introuvable" };
  }

  // Seul un challenge "active" a encaissé son prize pool : un challenge
  // awaiting_payment (Checkout créée mais jamais payée) ne doit pas accumuler
  // de soumissions ni distribuer d'XP pour une cagnotte qui n'existe pas.
  if (challenge.status !== "active") {
    return { error: "Ce challenge n'est pas ouvert aux soumissions" };
  }

  if (new Date(challenge.submission_deadline) <= new Date()) {
    return { error: "La deadline de soumission est dépassée" };
  }

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id, xp")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!creatorProfile) {
    return { error: "Complète d'abord ton profil créateur" };
  }

  const { tiktokUrl, reelsUrl, shortsUrl, views, saves, likes, shares } =
    parsed.data;

  const { error: insertError } = await supabase.from("submissions").insert({
    challenge_id: challengeId,
    creator_id: creatorProfile.id,
    tiktok_url: tiktokUrl,
    reels_url: reelsUrl,
    shorts_url: shortsUrl ?? null,
    declared_views: views,
    declared_saves: saves,
    declared_likes: likes,
    declared_shares: shares,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Tu as déjà soumis une vidéo pour ce challenge" };
    }
    return { error: "Impossible d'enregistrer la soumission" };
  }

  const newXp = creatorProfile.xp + 10;
  await supabase
    .from("creator_profiles")
    .update({ xp: newXp, level: levelForXp(newXp) })
    .eq("id", creatorProfile.id);

  return { success: true };
}
