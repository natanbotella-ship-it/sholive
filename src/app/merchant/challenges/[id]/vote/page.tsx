import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeFr } from "@/lib/format-date";
import { rankSubmissionsByMetricScore } from "@/lib/scoring";
import { VoteForm } from "./vote-form";

// Page de vote (refonte Nuit des Lumières 2026-07-07) — états de garde en
// cartes neutres, explication du poids du vote, top 10 en liste podium.
// Toute la logique (transition paresseuse active->voting, gardes, requêtes,
// top 10) est strictement inchangée.
export default async function MerchantChallengeVotePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: merchantProfile } = await supabase
    .from("merchant_profiles")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!merchantProfile) {
    redirect("/merchant/onboarding");
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title, merchant_id, status, submission_deadline, vote_deadline")
    .eq("id", params.id)
    .single();

  if (!challenge || challenge.merchant_id !== merchantProfile.id) {
    notFound();
  }

  const submissionDeadlinePassed =
    new Date(challenge.submission_deadline) <= new Date();

  // Transition paresseuse active -> voting (pas de cron dans la stack) : appliquée par
  // le premier accès à cette page après submission_deadline. Service role : status est
  // une colonne privilégiée (plus de grant update client sur challenges), l'ownership
  // a été vérifié explicitement ci-dessus. Conditionné sur le statut courant pour ne
  // pas écraser une transition concurrente (finalisation dans un autre onglet).
  if (challenge.status === "active" && submissionDeadlinePassed) {
    await createAdminClient()
      .from("challenges")
      .update({ status: "voting" })
      .eq("id", challenge.id)
      .eq("status", "active");
    challenge.status = "voting";
  }

  const backLink = (
    <Link
      href={`/merchant/challenges/${challenge.id}`}
      className="link w-fit text-sm"
    >
      ← {challenge.title}
    </Link>
  );

  const pageHeading = (
    <h1 className="font-display text-3xl font-extrabold tracking-tight">
      Mon coup de cœur
    </h1>
  );

  if (challenge.status === "results_finalized" || challenge.status === "refunded") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        <div className="card p-5">
          <p className="text-sm text-muted">Ce challenge est déjà terminé.</p>
        </div>
      </main>
    );
  }

  if (!submissionDeadlinePassed) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        <div className="card flex flex-col gap-1 p-5">
          <p className="text-sm font-semibold">
            Les soumissions sont encore ouvertes.
          </p>
          <p className="text-sm text-muted">
            Les créateurs ont jusqu&apos;au{" "}
            {formatDateTimeFr(challenge.submission_deadline)} pour poster leurs
            vidéos. Reviens après cette date pour voter.
          </p>
        </div>
      </main>
    );
  }

  const voteDeadlinePassed = new Date(challenge.vote_deadline) <= new Date();

  const { data: existingVote } = await supabase
    .from("votes")
    .select("submission_id, submissions!inner(creator_profiles!inner(username))")
    .eq("challenge_id", challenge.id)
    .eq("merchant_id", merchantProfile.id)
    .maybeSingle();

  if (voteDeadlinePassed) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        <div className="card p-5">
          <p className="text-sm text-muted">
            La période de vote (7 jours) est terminée — le classement final se
            calcule sur les statistiques seules.
            {existingVote &&
              ` Ton vote pour @${existingVote.submissions.creator_profiles.username} a bien été pris en compte.`}
          </p>
        </div>
      </main>
    );
  }

  if (existingVote) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        <div className="card flex flex-col gap-1 p-5">
          <p className="text-sm font-semibold">
            Tu as voté pour @
            {existingVote.submissions.creator_profiles.username}. Merci !
          </p>
          <p className="text-sm text-muted">
            Les résultats seront calculés à la fin de la période de vote.
          </p>
        </div>
      </main>
    );
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, declared_views, declared_saves, declared_likes, declared_shares, created_at, creator_profiles!inner(username)",
    )
    .eq("challenge_id", challenge.id);

  const top10 = rankSubmissionsByMetricScore(submissions ?? []).slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      {backLink}
      <div className="flex flex-col gap-2">
        {pageHeading}
        <p className="text-sm leading-relaxed text-muted">
          Choisis ta vidéo préférée dans le top 10 (classé par score de
          statistiques). Ton coup de cœur reçoit un gros bonus au classement
          final — à toi de jouer avant le{" "}
          {formatDateTimeFr(challenge.vote_deadline)}.
        </p>
        <p className="text-xs text-muted">
          Pour revoir les vidéos, retourne sur{" "}
          <Link href={`/merchant/challenges/${challenge.id}`} className="link">
            la page du challenge
          </Link>
          .
        </p>
      </div>

      {top10.length === 0 ? (
        <div className="card p-5">
          <p className="text-sm text-muted">Aucune soumission reçue.</p>
        </div>
      ) : (
        <VoteForm
          challengeId={challenge.id}
          candidates={top10.map((s) => ({
            id: s.id,
            username: s.creator_profiles.username,
            metricScore: s.metricScore,
          }))}
        />
      )}
    </main>
  );
}
