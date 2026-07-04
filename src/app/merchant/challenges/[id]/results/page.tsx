import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultsForm } from "./results-form";

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  awaiting_onboarding: "En attente que le créateur active ses paiements",
  pending: "Transfert en cours",
  paid: "Payé",
  failed: "Échec du virement",
  refunded: "Remboursé",
};

export default async function MerchantChallengeResultsPage({
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
    .select("id, title, merchant_id, status, vote_deadline")
    .eq("id", params.id)
    .single();

  if (!challenge || challenge.merchant_id !== merchantProfile.id) {
    notFound();
  }

  const backLink = (
    <Link
      href={`/merchant/challenges/${challenge.id}`}
      className="text-sm text-primary underline"
    >
      ← {challenge.title}
    </Link>
  );

  if (challenge.status === "refunded") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary">Résultats</h1>
        <p className="text-sm text-foreground/60">
          Ce challenge a reçu moins de 10 soumissions à la deadline. Aucun
          payout n&apos;est créé — contacte Natan pour déclencher le
          remboursement intégral (commission Sholive incluse).
        </p>
      </main>
    );
  }

  if (challenge.status !== "results_finalized") {
    const voteDeadlinePassed = new Date(challenge.vote_deadline) <= new Date();

    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary">Résultats</h1>
        {voteDeadlinePassed ? (
          <>
            <p className="text-sm text-foreground/60">
              La deadline de vote est passée, tu peux maintenant finaliser les
              résultats.
            </p>
            <ResultsForm challengeId={challenge.id} />
          </>
        ) : (
          <p className="text-sm text-foreground/60">
            Les résultats seront disponibles après la deadline de vote du{" "}
            {new Date(challenge.vote_deadline).toLocaleString("fr-FR")}.
          </p>
        )}
      </main>
    );
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, rank, metric_score, merchant_score, total_score, creator_profiles!inner(username)",
    )
    .eq("challenge_id", challenge.id)
    .order("rank", { ascending: true });

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, rank, status, creator_profiles!inner(username)")
    .eq("challenge_id", challenge.id)
    .order("rank", { ascending: true });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      {backLink}
      <h1 className="text-2xl font-bold text-primary">
        Résultats — {challenge.title}
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Classement final</h2>
        <ul className="flex flex-col gap-2">
          {(submissions ?? []).map((submission) => (
            <li
              key={submission.id}
              className="flex flex-col gap-1 rounded-md border p-3 text-sm"
            >
              <span className="font-semibold">
                #{submission.rank} @{submission.creator_profiles.username}
              </span>
              <span className="text-foreground/60">
                Score métriques {Number(submission.metric_score).toFixed(1)}
                /50 · Score marchand {submission.merchant_score.toFixed(1)}/50
                · Total {Number(submission.total_score).toFixed(1)}/100
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Payouts</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun payout créé pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-col gap-1 rounded-md border p-3 text-sm"
              >
                <span className="font-semibold">
                  #{payout.rank} @{payout.creator_profiles.username} —{" "}
                  {payout.amount.toFixed(2)}€
                </span>
                <span className="text-foreground/60">
                  {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
