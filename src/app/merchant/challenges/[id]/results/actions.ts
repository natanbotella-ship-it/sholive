"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankSubmissionsByMetricScore } from "@/lib/scoring";
import { levelForXp } from "@/lib/xp";

export type FinalizeResultsState = {
  error?: string;
  refunded?: boolean;
  finalized?: boolean;
};

// < 10 soumissions à submission_deadline -> remboursement intégral manuel (Bloc 15),
// pas de scoring, pas de payout. Remplace toute logique de remboursement partiel (CLAUDE.md).
const MIN_SUBMISSIONS = 10;

export async function finalizeChallengeResultsAction(
  _prevState: FinalizeResultsState,
  formData: FormData,
): Promise<FinalizeResultsState> {
  const challengeId = formData.get("challengeId");
  if (typeof challengeId !== "string" || !challengeId) {
    return { error: "Challenge introuvable" };
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

  // Idempotence : un second clic (ou un rechargement de page) ne doit jamais
  // recalculer le scoring ni réattribuer l'XP une deuxième fois.
  if (challenge.status === "results_finalized") {
    return { finalized: true };
  }
  if (challenge.status === "refunded") {
    return { refunded: true };
  }

  if (new Date(challenge.vote_deadline) > new Date()) {
    return { error: "La deadline de vote n'est pas encore passée" };
  }

  // Ecritures cross-user privilegiees (scoring/XP/wins sur des soumissions et
  // profils appartenant a des createurs) : client service role, jamais le client standard.
  const admin = createAdminClient();

  const { count: submissionsCount } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  if ((submissionsCount ?? 0) < MIN_SUBMISSIONS) {
    await admin
      .from("challenges")
      .update({ status: "refunded" })
      .eq("id", challengeId);
    return { refunded: true };
  }

  const { data: submissions } = await admin
    .from("submissions")
    .select(
      "id, creator_id, declared_views, declared_saves, declared_likes, declared_shares, merchant_score, created_at",
    )
    .eq("challenge_id", challengeId);

  if (!submissions || submissions.length === 0) {
    return { error: "Aucune soumission trouvée" };
  }

  // merchant_score ne repart a 0 que si aucun vote n'existe (algorithme seul) ;
  // sinon on respecte tel quel le vote du Bloc 13 (50 gagnant / 0 les autres).
  const { data: existingVote } = await admin
    .from("votes")
    .select("id")
    .eq("challenge_id", challengeId)
    .limit(1)
    .maybeSingle();
  const hasVote = Boolean(existingVote);

  const metricScoreById = new Map(
    rankSubmissionsByMetricScore(submissions).map((s) => [s.id, s.metricScore]),
  );

  const ranked = submissions
    .map((s) => {
      const metricScore = metricScoreById.get(s.id) ?? 0;
      const merchantScore = hasVote ? s.merchant_score : 0;
      return {
        id: s.id,
        creatorId: s.creator_id,
        createdAt: s.created_at,
        metricScore,
        merchantScore,
        totalScore: metricScore + merchantScore,
      };
    })
    // Égalité sur total_score : score métriques le plus haut puis soumission la plus ancienne (CLAUDE.md).
    .sort((a, b) => {
      const totalDiff = b.totalScore - a.totalScore;
      if (totalDiff !== 0) return totalDiff;
      const metricDiff = b.metricScore - a.metricScore;
      if (metricDiff !== 0) return metricDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  for (let index = 0; index < ranked.length; index++) {
    const submission = ranked[index];
    await admin
      .from("submissions")
      .update({
        metric_score: submission.metricScore,
        merchant_score: submission.merchantScore,
        total_score: submission.totalScore,
        rank: index + 1,
      })
      .eq("id", submission.id);
  }

  // XP top 3 (+50) et victoire (+100), cumulables : le gagnant reçoit +150 au total.
  const top3 = ranked.slice(0, 3);
  for (let index = 0; index < top3.length; index++) {
    const submission = top3[index];
    const bonusXp = index === 0 ? 150 : 50;
    const { data: creatorProfile } = await admin
      .from("creator_profiles")
      .select("xp, wins")
      .eq("id", submission.creatorId)
      .single();

    if (creatorProfile) {
      const newXp = creatorProfile.xp + bonusXp;
      await admin
        .from("creator_profiles")
        .update({
          xp: newXp,
          level: levelForXp(newXp),
          ...(index === 0 ? { wins: creatorProfile.wins + 1 } : {}),
        })
        .eq("id", submission.creatorId);
    }
  }

  await admin
    .from("challenges")
    .update({ status: "results_finalized" })
    .eq("id", challengeId);

  return { finalized: true };
}
