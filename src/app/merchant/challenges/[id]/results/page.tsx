import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeFr } from "@/lib/format-date";
import { PAYOUT_STATUS_LABELS } from "@/lib/payout-status";
import { DISPUTE_WINDOW_HOURS } from "@/lib/scheduling";
import { ResultsForm } from "./results-form";
import { DisputeForm } from "./dispute-form";

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
    .select(
      "id, title, merchant_id, status, vote_deadline, results_finalized_at, results_disputed_at",
    )
    .eq("id", params.id)
    .single();

  if (!challenge || challenge.merchant_id !== merchantProfile.id) {
    notFound();
  }

  const backLink = (
    <Link
      href={`/merchant/challenges/${challenge.id}`}
      className="link text-sm"
    >
      ← {challenge.title}
    </Link>
  );

  if (challenge.status === "refunded") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary-ink">Résultats</h1>
        <p className="text-sm text-muted">
          Ce challenge a reçu moins de 10 soumissions à la deadline. Aucun
          payout n&apos;est créé — contacte Natan pour déclencher le
          remboursement intégral (commission Sholive incluse).
        </p>
      </main>
    );
  }

  // Un challenge jamais payé (draft/awaiting_payment) ne doit pas proposer la
  // finalisation — l'action la refuse aussi côté serveur.
  if (challenge.status === "draft" || challenge.status === "awaiting_payment") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary-ink">Résultats</h1>
        <p className="text-sm text-muted">
          Ce challenge n&apos;a pas été lancé (prize pool non payé), il n&apos;y a
          pas de résultats à calculer.
        </p>
      </main>
    );
  }

  if (challenge.status !== "results_finalized") {
    const voteDeadlinePassed = new Date(challenge.vote_deadline) <= new Date();

    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
        {backLink}
        <h1 className="text-2xl font-bold text-primary-ink">Résultats</h1>
        {voteDeadlinePassed ? (
          <>
            <p className="text-sm text-muted">
              La deadline de vote est passée, tu peux maintenant finaliser les
              résultats.
            </p>
            <ResultsForm challengeId={challenge.id} />
          </>
        ) : (
          <p className="text-sm text-muted">
            Les résultats seront disponibles après la deadline de vote du{" "}
            {formatDateTimeFr(challenge.vote_deadline)}.
          </p>
        )}
      </main>
    );
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, rank, metric_score, merchant_score, total_score, declared_views, declared_saves, declared_likes, declared_shares, tiktok_url, reels_url, shorts_url, creator_profiles!inner(username)",
    )
    .eq("challenge_id", challenge.id)
    .order("rank", { ascending: true });

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, rank, status, creator_profiles!inner(username)")
    .eq("challenge_id", challenge.id)
    .order("rank", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      {backLink}
      <h1 className="text-2xl font-bold text-primary-ink">
        Résultats — {challenge.title}
      </h1>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Classement final</h2>
          <Link href="/comment-ca-marche#scoring" className="link text-sm">
            Comment le score est calculé ?
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {(submissions ?? []).map((submission) => (
            <li
              key={submission.id}
              className="flex flex-col gap-1 card p-3 text-sm"
            >
              <span className="font-semibold">
                #{submission.rank} @{submission.creator_profiles.username}
              </span>
              <span className="text-muted">
                {submission.declared_views} vues · {submission.declared_saves}{" "}
                saves · {submission.declared_likes} likes ·{" "}
                {submission.declared_shares} partages
              </span>
              <span className="text-muted">
                Score métriques {Number(submission.metric_score).toFixed(1)}
                /50 · Score marchand {submission.merchant_score.toFixed(1)}/50
                · Total {Number(submission.total_score).toFixed(1)}/100
              </span>
              {/* Liens vidéo affichés seulement pour le top 3 (ceux qui seront payés) —
                  écran de vérification anti-fraude, pre-mortem 2026-07-06 : le scoring
                  reposant sur des stats auto-déclarées, c'est ici que tu peux repérer un
                  lien bidon avant que le Transfer ne parte. */}
              {submission.rank !== null && submission.rank <= 3 && (
                <div className="flex flex-wrap gap-3">
                  {submission.tiktok_url && (
                    <a
                      href={submission.tiktok_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                    >
                      TikTok
                    </a>
                  )}
                  {submission.reels_url && (
                    <a
                      href={submission.reels_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                    >
                      Reels
                    </a>
                  )}
                  {submission.shorts_url && (
                    <a
                      href={submission.shorts_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                    >
                      Shorts
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Payouts</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun payout créé pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-col gap-1 card p-3 text-sm"
              >
                <span className="font-semibold">
                  #{payout.rank} @{payout.creator_profiles.username} —{" "}
                  {payout.amount.toFixed(2)}€
                </span>
                <span className="text-muted">
                  {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fenêtre de litige (pre-mortem 2026-07-06) : tant qu'un payout est
          "awaiting_review", aucun Transfer réel n'a encore été tenté — c'est la
          fenêtre pour vérifier les liens ci-dessus et signaler un problème. */}
      {payouts && payouts.length > 0 && (
        <section className="flex flex-col gap-2 card">
          <h2 className="text-lg font-semibold">Vérification anti-fraude</h2>
          {challenge.results_disputed_at ? (
            <p className="text-sm text-muted">
              Signalement enregistré le{" "}
              {formatDateTimeFr(challenge.results_disputed_at)}. Les paiements
              en attente restent bloqués jusqu&apos;à vérification par Natan.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Les paiements en attente ({DISPUTE_WINDOW_HOURS}h après la
                finalisation) sont déclenchés automatiquement, sauf
                signalement. Vérifie les liens du top 3 ci-dessus avant cette
                échéance si quelque chose te semble anormal.
              </p>
              <DisputeForm challengeId={challenge.id} />
            </>
          )}
        </section>
      )}
    </main>
  );
}
