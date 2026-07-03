"use server";

import { createClient } from "@/lib/supabase/server";
import { challengeSchema } from "./schema";

export type CreateChallengeState = {
  error?: string;
  success?: boolean;
  challengeId?: string;
};

export async function createChallengeAction(
  _prevState: CreateChallengeState,
  formData: FormData,
): Promise<CreateChallengeState> {
  const parsed = challengeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    concept: formData.get("concept"),
    consignes: formData.get("consignes"),
    hashtagsObligatoires: formData.get("hashtagsObligatoires"),
    exemplesInspiration: formData.get("exemplesInspiration"),
    prizePool: formData.get("prizePool"),
    rank1: formData.get("rank1"),
    rank2: formData.get("rank2"),
    rank3: formData.get("rank3"),
    submissionDeadline: formData.get("submissionDeadline"),
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

  const { data: merchantProfile } = await supabase
    .from("merchant_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchantProfile) {
    return { error: "Complète d'abord ton profil pro" };
  }

  const {
    title,
    description,
    concept,
    consignes,
    hashtagsObligatoires,
    exemplesInspiration,
    prizePool,
    rank1,
    rank2,
    rank3,
    submissionDeadline,
  } = parsed.data;

  const submissionDeadlineDate = new Date(submissionDeadline);
  const voteDeadlineDate = new Date(
    submissionDeadlineDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      merchant_id: merchantProfile.id,
      title,
      description,
      brief: {
        concept,
        consignes,
        hashtags_obligatoires: hashtagsObligatoires,
        exemples_inspiration: exemplesInspiration,
      },
      prize_pool: prizePool,
      prize_distribution: { "1": rank1, "2": rank2, "3": rank3 },
      submission_deadline: submissionDeadlineDate.toISOString(),
      vote_deadline: voteDeadlineDate.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Impossible de créer le challenge" };
  }

  return { success: true, challengeId: challenge.id };
}
