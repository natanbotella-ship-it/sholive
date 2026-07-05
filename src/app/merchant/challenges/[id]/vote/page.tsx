import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeFr } from "@/lib/format-date";
import { rankSubmissionsByMetricScore } from "@/lib/scoring";
import { VoteForm } from "./vote-form";

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
      className="text-sm text-primary underline"
    >
      ← {challenge.title}
    </Link>
  );

  if (challenge.status === "results_finalized" || challenge.status === "refunded") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <p className="text-sm text-foreground/60">
          Ce challenge est déjà terminé.
        </p>
      </main>
    );
  }

  if (!submissionDeadlinePassed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary">Vote</h1>
        <p className="text-sm text-foreground/60">
          Les soumissions sont encore ouvertes jusqu&apos;au{" "}
          {formatDateTimeFr(challenge.submission_deadline)}.
          Reviens après cette date pour voter.
        </p>
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
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary">Vote</h1>
        <p className="text-sm text-foreground/60">
          La deadline de vote (J+7) est dépassée, l&apos;algorithme décidera
          seul du classement final.
          {existingVote &&
            ` Ton vote pour @${existingVote.submissions.creator_profiles.username} a bien été pris en compte.`}
        </p>
      </main>
    );
  }

  if (existingVote) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary">Vote</h1>
        <p className="text-sm">
          Tu as déjà voté pour @
          {existingVote.submissions.creator_profiles.username}. Merci !
        </p>
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      {backLink}
      <h1 className="text-2xl font-bold text-primary">Vote — {challenge.title}</h1>
      <p className="text-sm text-foreground/60">
        Choisis ta soumission gagnante parmi le top 10 (classé par score
        métriques). Deadline de vote :{" "}
        {formatDateTimeFr(challenge.vote_deadline)}.
      </p>

      {top10.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune soumission reçue.</p>
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
