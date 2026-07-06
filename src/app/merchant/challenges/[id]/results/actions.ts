"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { rankSubmissionsByMetricScore } from "@/lib/scoring";
import { levelForXp } from "@/lib/xp";
import { computePayoutShares } from "@/lib/payouts";
import { centsToEuros } from "@/lib/money";
import { notifyAdmin } from "@/lib/notify-admin";

export type FinalizeResultsState = {
  error?: string;
  refunded?: boolean;
  finalized?: boolean;
};

// < 10 soumissions à submission_deadline -> remboursement intégral manuel (Bloc 15),
// pas de scoring, pas de payout. Remplace toute logique de remboursement partiel (CLAUDE.md).
const MIN_SUBMISSIONS = 10;

// Coeur du scoring/finalisation, sans vérification de session ni d'ownership : appelé
// soit par finalizeChallengeResultsAction (après vérification que le merchant appelant
// possède bien ce challenge), soit par le cron d'auto-finalisation (pre-mortem
// 2026-07-06, src/app/api/cron/*) dont la seule autorisation est le secret CRON_SECRET —
// il n'y a pas de "merchant appelant" à vérifier dans ce second cas, le cron traite tous
// les challenges éligibles.
export async function finalizeChallengeCore(
  challengeId: string,
): Promise<FinalizeResultsState> {
  // Ecritures cross-user privilegiees (scoring/XP/wins sur des soumissions et
  // profils appartenant a des createurs) : client service role, jamais le client standard.
  const admin = createAdminClient();

  const { data: challenge } = await admin
    .from("challenges")
    .select("id, status, vote_deadline")
    .eq("id", challengeId)
    .single();

  if (!challenge) {
    return { error: "Challenge introuvable" };
  }

  // Idempotence : un second clic (ou un rechargement de page, ou un passage du cron
  // après que le pro ait déjà cliqué) ne doit jamais recalculer le scoring ni
  // réattribuer l'XP une deuxième fois.
  if (challenge.status === "results_finalized") {
    return { finalized: true };
  }
  if (challenge.status === "refunded") {
    return { refunded: true };
  }

  // Un challenge draft/awaiting_payment n'a jamais encaissé son prize pool :
  // le finaliser passerait en "refunded" (instruction de rembourser un argent
  // jamais collecté) ou créerait des payouts sans fonds. Seuls active/voting
  // sont finalisables.
  if (challenge.status !== "active" && challenge.status !== "voting") {
    return { error: "Ce challenge n'a jamais été lancé (prize pool non payé)" };
  }

  if (new Date(challenge.vote_deadline) > new Date()) {
    return { error: "La deadline de vote n'est pas encore passée" };
  }

  const { count: submissionsCount } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  if ((submissionsCount ?? 0) < MIN_SUBMISSIONS) {
    // Conditionné sur active/voting : une requête concurrente qui aurait déjà
    // fait la transition ne doit pas être écrasée (le décompte étant le même,
    // l'issue est identique — refunded dans les deux cas).
    const { data: justRefunded } = await admin
      .from("challenges")
      .update({ status: "refunded" })
      .eq("id", challengeId)
      .in("status", ["active", "voting"])
      .select("id");
    if (justRefunded && justRefunded.length > 0) {
      // Remboursement intégral manuel (commission incluse) : le seul déclencheur
      // est Natan (CLAUDE.md), donc il doit être notifié que ce challenge l'attend.
      await notifyAdmin(
        "Challenge à rembourser (< 10 soumissions)",
        `Le challenge ${challengeId} est passé "refunded" (moins de ${MIN_SUBMISSIONS} soumissions à submission_deadline). Remboursement intégral (commission incluse) à déclencher manuellement.`,
      );
    }
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

  // Verrou contre les finalisations concurrentes (double clic dans deux onglets, ou
  // cron + clic manuel simultanés) : les écritures de scores/rangs ci-dessus sont
  // déterministes (les ré-écrire ne change rien), mais l'attribution d'XP/wins est un
  // incrément — elle ne doit être exécutée que par la requête qui remporte la
  // transition de statut. results_finalized_at marque le début de la fenêtre de
  // litige de 72h avant tout Transfer réel (pre-mortem 2026-07-06, cf. payouts.status
  // 'awaiting_review' et le cron de sweep).
  const { data: claimed } = await admin
    .from("challenges")
    .update({
      status: "results_finalized",
      results_finalized_at: new Date().toISOString(),
    })
    .eq("id", challengeId)
    .in("status", ["active", "voting"])
    .select("id");

  if (!claimed || claimed.length === 0) {
    // Une requête concurrente a déjà finalisé : elle s'occupe de l'XP.
    return { finalized: true };
  }

  // XP : +10 participation (tous les participants, désormais crédité ici plutôt
  // qu'à la soumission — anti-farming, pre-mortem 2026-07-06, cf. submitAction),
  // +50 top 3, +100 victoire, cumulables (le gagnant reçoit 10+50+100 = 160 au
  // total ; CLAUDE.md compte le +150 top3+victoire séparément du +10 participation).
  for (let index = 0; index < ranked.length; index++) {
    const submission = ranked[index];
    const topBonus = index === 0 ? 150 : index < 3 ? 50 : 0;
    const bonusXp = 10 + topBonus;
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

  return { finalized: true };
}

export async function finalizeChallengeResultsAction(
  _prevState: FinalizeResultsState,
  formData: FormData,
): Promise<FinalizeResultsState> {
  const challengeId = formData.get("challengeId");
  if (typeof challengeId !== "string" || !challengeId) {
    return { error: "Challenge introuvable" };
  }

  const supabase = createClient();
  // Rôle vérifié contre profiles.role (user_metadata est forgeable, cf. lib/auth).
  const auth = await getAuthenticatedUser(supabase);

  if (!auth || auth.role !== "merchant") {
    return { error: "Accès réservé aux comptes pro" };
  }

  const { data: merchantProfile } = await supabase
    .from("merchant_profiles")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!merchantProfile) {
    return { error: "Profil pro introuvable" };
  }

  // RLS restreint deja cette lecture au merchant proprietaire : c'est ici que
  // l'ownership est vérifié, avant de déléguer au coeur partagé (service role, qui
  // lui ne revérifie plus rien — cf. finalizeChallengeCore).
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, merchant_id")
    .eq("id", challengeId)
    .single();

  if (!challenge || challenge.merchant_id !== merchantProfile.id) {
    return { error: "Challenge introuvable" };
  }

  return finalizeChallengeCore(challengeId);
}

// Crée les payouts des 3 premiers (80% net du prize_pool, réparti selon prize_distribution,
// arrondi à l'inférieur par rang, reliquat de centimes ajouté au 1er). Idempotent : si des
// payouts existent déjà pour ce challenge, ne recrée rien (protège contre un double clic).
// Statut initial 'awaiting_review' : AUCUN Transfer Stripe n'est tenté ici (pre-mortem
// 2026-07-06) — le cron de sweep (src/app/api/cron/*) s'en charge une fois la fenêtre de
// litige de 72h passée, sauf signalement du pro (challenges.results_disputed_at).
// Exportée pour être appelée par le cron d'auto-finalisation en plus de viewResultsAction.
export async function createPayoutsForChallenge(challengeId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: existingPayouts } = await admin
    .from("payouts")
    .select("id")
    .eq("challenge_id", challengeId)
    .limit(1);

  if (existingPayouts && existingPayouts.length > 0) {
    return;
  }

  const { data: challenge } = await admin
    .from("challenges")
    .select("prize_pool, prize_distribution")
    .eq("id", challengeId)
    .single();

  if (!challenge) {
    return;
  }

  const { data: topSubmissions } = await admin
    .from("submissions")
    .select("creator_id, rank")
    .eq("challenge_id", challengeId)
    .in("rank", [1, 2, 3])
    .order("rank", { ascending: true });

  if (!topSubmissions || topSubmissions.length === 0) {
    return;
  }

  const distribution = challenge.prize_distribution as Record<string, number>;
  const creatorIdByRank = new Map(
    topSubmissions.map((s) => [s.rank as number, s.creator_id]),
  );
  const shares = computePayoutShares(
    Number(challenge.prize_pool),
    distribution,
    topSubmissions.map((s) => s.rank as number),
  ).map((share) => ({
    ...share,
    creatorId: creatorIdByRank.get(share.rank)!,
  }));

  for (const share of shares) {
    // Insert ignoré silencieusement en cas d'échec (notamment 23505, contrainte unique
    // challenge_id+creator_id, si un appel concurrent a déjà créé ce payout).
    await admin.from("payouts").insert({
      challenge_id: challengeId,
      creator_id: share.creatorId,
      amount: centsToEuros(share.cents),
      rank: share.rank,
      status: "awaiting_review",
    });
  }
}

export type ViewResultsState = FinalizeResultsState;

export async function viewResultsAction(
  prevState: ViewResultsState,
  formData: FormData,
): Promise<ViewResultsState> {
  const finalizeResult = await finalizeChallengeResultsAction(prevState, formData);

  if (finalizeResult.error || finalizeResult.refunded) {
    return finalizeResult;
  }

  const challengeId = formData.get("challengeId");
  if (typeof challengeId === "string" && challengeId) {
    await createPayoutsForChallenge(challengeId);
  }

  return { finalized: true };
}
