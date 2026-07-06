"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { rankSubmissionsByMetricScore } from "@/lib/scoring";
import { levelForXp } from "@/lib/xp";
import { computePayoutShares } from "@/lib/payouts";
import { centsToEuros } from "@/lib/money";

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

  // Ecritures cross-user privilegiees (scoring/XP/wins sur des soumissions et
  // profils appartenant a des createurs) : client service role, jamais le client standard.
  const admin = createAdminClient();

  const { count: submissionsCount } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  if ((submissionsCount ?? 0) < MIN_SUBMISSIONS) {
    // Conditionné sur active/voting : une requête concurrente qui aurait déjà
    // fait la transition ne doit pas être écrasée (le décompte étant le même,
    // l'issue est identique — refunded dans les deux cas).
    await admin
      .from("challenges")
      .update({ status: "refunded" })
      .eq("id", challengeId)
      .in("status", ["active", "voting"]);
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

  // Verrou contre les finalisations concurrentes (double clic dans deux onglets) :
  // les écritures de scores/rangs ci-dessus sont déterministes (les ré-écrire ne
  // change rien), mais l'attribution d'XP/wins est un incrément — elle ne doit
  // être exécutée que par la requête qui remporte la transition de statut. La
  // vérification d'idempotence en début d'action ne suffit pas : deux requêtes
  // simultanées lisent toutes les deux "voting" avant que l'une n'écrive.
  const { data: claimed } = await admin
    .from("challenges")
    .update({ status: "results_finalized" })
    .eq("id", challengeId)
    .in("status", ["active", "voting"])
    .select("id");

  if (!claimed || claimed.length === 0) {
    // Une requête concurrente a déjà finalisé : elle s'occupe de l'XP.
    return { finalized: true };
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

  return { finalized: true };
}

// Crée les payouts des 3 premiers (80% net du prize_pool, réparti selon prize_distribution,
// arrondi à l'inférieur par rang, reliquat de centimes ajouté au 1er). Idempotent : si des
// payouts existent déjà pour ce challenge, ne recrée rien (protège contre un double clic).
async function createPayoutsForChallenge(challengeId: string): Promise<void> {
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
    const { data: creatorProfile } = await admin
      .from("creator_profiles")
      .select("stripe_account_id, stripe_onboarding_status")
      .eq("id", share.creatorId)
      .single();

    const { data: payout } = await admin
      .from("payouts")
      .insert({
        challenge_id: challengeId,
        creator_id: share.creatorId,
        amount: centsToEuros(share.cents),
        rank: share.rank,
        status: "awaiting_onboarding",
      })
      .select("id")
      .single();

    // payout null = insert refusé, notamment 23505 (contrainte unique
    // challenge_id+creator_id) quand un appel concurrent a déjà créé ce payout :
    // c'est lui qui s'occupe du Transfer, on passe au rang suivant.
    if (
      payout &&
      creatorProfile?.stripe_onboarding_status === "complete" &&
      creatorProfile.stripe_account_id
    ) {
      try {
        const transfer = await stripe.transfers.create(
          {
            amount: share.cents,
            currency: "eur",
            destination: creatorProfile.stripe_account_id,
            // Permet aux webhooks transfer.created/transfer.failed de retrouver
            // le payout même si l'update ci-dessous n'a pas encore été écrit.
            metadata: { payout_id: payout.id },
          },
          {
            // Même clé que dans le webhook account.updated : deux déclenchements
            // concurrents (double clic "Voir les résultats" dans deux onglets,
            // webhook simultané) ne peuvent pas créer deux Transfers réels pour
            // le même gagnant du même challenge.
            idempotencyKey: `payout-transfer-${challengeId}-${share.creatorId}`,
          },
        );
        // Conditionné sur awaiting_onboarding : si le webhook transfer.created est
        // arrivé entre-temps et a déjà marqué "paid", on ne rétrograde pas en "pending".
        await admin
          .from("payouts")
          .update({ status: "pending", stripe_transfer_id: transfer.id })
          .eq("id", payout.id)
          .eq("status", "awaiting_onboarding");
      } catch {
        // L'appel de creation du Transfer a echoue de facon synchrone (pas un
        // transfer.failed webhook apres coup) : le compte est deja "complete", donc
        // rien ne redeclenchera automatiquement une nouvelle tentative (le webhook
        // account.updated du Bloc 11 ne reagit qu'a un changement de statut d'onboarding).
        // On marque le payout failed pour que ce soit visible et traite manuellement,
        // plutot que de le laisser a tort en awaiting_onboarding (qui ne serait alors
        // plus jamais repris). Conditionne sur awaiting_onboarding : si un appel
        // concurrent a deja cree le Transfer (conflit de cle d'idempotence Stripe
        // levant une exception ici), on n'ecrase pas son "pending"/"paid".
        await admin
          .from("payouts")
          .update({ status: "failed" })
          .eq("id", payout.id)
          .eq("status", "awaiting_onboarding");
      }
    }
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
