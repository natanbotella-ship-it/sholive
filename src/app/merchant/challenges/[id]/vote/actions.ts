"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankSubmissionsByMetricScore } from "@/lib/scoring";

export type VoteState = {
  error?: string;
};

export async function castVoteAction(
  _prevState: VoteState,
  formData: FormData,
): Promise<VoteState> {
  const challengeId = formData.get("challengeId");
  const submissionId = formData.get("submissionId");

  if (typeof challengeId !== "string" || !challengeId) {
    return { error: "Challenge introuvable" };
  }
  if (typeof submissionId !== "string" || !submissionId) {
    return { error: "Sélectionne une soumission" };
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
    return { error: "Profil pro introuvable" };
  }

  // RLS restreint deja cette lecture au merchant proprietaire.
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, merchant_id, status, vote_deadline")
    .eq("id", challengeId)
    .single();

  if (!challenge || challenge.merchant_id !== merchantProfile.id) {
    return { error: "Challenge introuvable" };
  }

  if (new Date(challenge.vote_deadline) <= new Date()) {
    return {
      error: "La deadline de vote est dépassée, l'algorithme décidera seul",
    };
  }

  if (challenge.status !== "active" && challenge.status !== "voting") {
    return { error: "Ce challenge n'est plus ouvert au vote" };
  }

  // Ecritures cross-user privilegiees (merchant_score sur des soumissions
  // appartenant a des createurs) : client service role, jamais le client standard.
  const admin = createAdminClient();

  const { data: submissions } = await admin
    .from("submissions")
    .select(
      "id, declared_views, declared_saves, declared_likes, declared_shares, created_at",
    )
    .eq("challenge_id", challengeId);

  if (!submissions || submissions.length === 0) {
    return { error: "Aucune soumission pour ce challenge" };
  }

  const top10Ids = new Set(
    rankSubmissionsByMetricScore(submissions)
      .slice(0, 10)
      .map((s) => s.id),
  );

  if (!top10Ids.has(submissionId)) {
    return { error: "Cette soumission ne fait pas partie du top 10" };
  }

  const { error: voteError } = await admin.from("votes").insert({
    challenge_id: challengeId,
    merchant_id: merchantProfile.id,
    submission_id: submissionId,
  });

  if (voteError) {
    if (voteError.code === "23505") {
      return { error: "Tu as déjà voté pour ce challenge" };
    }
    return { error: "Impossible d'enregistrer le vote" };
  }

  await admin
    .from("submissions")
    .update({ merchant_score: 0 })
    .eq("challenge_id", challengeId);

  await admin
    .from("submissions")
    .update({ merchant_score: 50 })
    .eq("id", submissionId);

  if (challenge.status === "active") {
    await admin
      .from("challenges")
      .update({ status: "voting" })
      .eq("id", challengeId);
  }

  redirect(`/merchant/challenges/${challengeId}/vote`);
}
