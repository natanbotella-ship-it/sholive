import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeFr } from "@/lib/format-date";
import { PAYOUT_STATUS_LABELS } from "@/lib/payout-status";
import { DISPUTE_WINDOW_HOURS } from "@/lib/scheduling";
import { ResultsForm } from "./results-form";
import { DisputeForm } from "./dispute-form";

// Page résultats (refonte Nuit des Lumières 2026-07-07) — podium doré pour le
// top 3 (liens vidéo = écran de vérification anti-fraude, inchangé), payouts
// en montants dorés, section litige explicite. Gardes, requêtes et actions
// strictement inchangées.

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

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
      className="link w-fit text-sm"
    >
      ← {challenge.title}
    </Link>
  );

  const pageHeading = (
    <h1 className="font-display text-3xl font-extrabold tracking-tight">
      Résultats
    </h1>
  );

  if (challenge.status === "refunded") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-muted">
            Ce challenge a reçu moins de 10 soumissions à la deadline. Aucun
            payout n&apos;est créé — contacte Natan pour déclencher le
            remboursement intégral (commission Sholive incluse).
          </p>
        </div>
      </main>
    );
  }

  // Un challenge jamais payé (draft/awaiting_payment) ne doit pas proposer la
  // finalisation — l'action la refuse aussi côté serveur.
  if (challenge.status === "draft" || challenge.status === "awaiting_payment") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        <div className="card p-5">
          <p className="text-sm text-muted">
            Ce challenge n&apos;a pas été lancé (cagnotte non payée), il
            n&apos;y a pas de résultats à calculer.
          </p>
        </div>
      </main>
    );
  }

  if (challenge.status !== "results_finalized") {
    const voteDeadlinePassed = new Date(challenge.vote_deadline) <= new Date();

    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        {backLink}
        {pageHeading}
        {voteDeadlinePassed ? (
          <div className="card flex flex-col gap-3 p-5">
            <p className="text-sm leading-relaxed text-muted">
              La période de vote est terminée. Lance le calcul du classement
              final — les paiements des 3 premiers seront préparés
              automatiquement.
            </p>
            <ResultsForm challengeId={challenge.id} />
          </div>
        ) : (
          <div className="card p-5">
            <p className="text-sm text-muted">
              Les résultats seront disponibles après la fin du vote, le{" "}
              {formatDateTimeFr(challenge.vote_deadline)}.
            </p>
          </div>
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      {backLink}
      <div className="flex flex-col gap-1">
        {pageHeading}
        <p className="text-sm text-muted">{challenge.title}</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Classement final</h2>
          <Link
            href="/comment-ca-marche#scoring"
            className="link shrink-0 text-sm"
          >
            Comment le score est calculé ?
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {(submissions ?? []).map((submission) => {
            const isPodium =
              submission.rank !== null && submission.rank <= 3;
            return (
              <li
                key={submission.id}
                className={`card flex flex-col gap-3 p-4 text-sm ${isPodium ? "border-accent/60" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-display text-base font-bold">
                    {submission.rank !== null && (
                      <span aria-hidden>
                        {RANK_MEDALS[submission.rank] ?? `#${submission.rank}`}
                      </span>
                    )}
                    @{submission.creator_profiles.username}
                  </span>
                  <span className="shrink-0 font-display text-lg font-extrabold">
                    {Number(submission.total_score).toFixed(1)}
                    <span className="text-xs font-semibold text-muted">/100</span>
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Statistiques {Number(submission.metric_score).toFixed(1)}/50 ·
                  Coup de cœur {submission.merchant_score.toFixed(1)}/50
                </p>
                <p className="text-xs text-muted">
                  {submission.declared_views} vues ·{" "}
                  {submission.declared_saves} sauvegardes ·{" "}
                  {submission.declared_likes} j&apos;aime ·{" "}
                  {submission.declared_shares} partages
                </p>
                {/* Liens vidéo affichés seulement pour le top 3 (ceux qui seront payés) —
                    écran de vérification anti-fraude, pre-mortem 2026-07-06 : le scoring
                    reposant sur des stats auto-déclarées, c'est ici que tu peux repérer un
                    lien bidon avant que le Transfer ne parte. */}
                {isPodium && (
                  <div className="flex flex-wrap gap-2">
                    {submission.tiktok_url && (
                      <a
                        href={submission.tiktok_url}
                        target="_blank"
                        rel="noreferrer"
                        className="chip"
                      >
                        ▶ TikTok
                      </a>
                    )}
                    {submission.reels_url && (
                      <a
                        href={submission.reels_url}
                        target="_blank"
                        rel="noreferrer"
                        className="chip"
                      >
                        ▶ Reels
                      </a>
                    )}
                    {submission.shorts_url && (
                      <a
                        href={submission.shorts_url}
                        target="_blank"
                        rel="noreferrer"
                        className="chip"
                      >
                        ▶ Shorts
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Paiements des gagnants</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun payout créé pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="card flex items-center justify-between gap-3 p-4 text-sm"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold">
                    {payout.rank !== null && (
                      <span aria-hidden>
                        {RANK_MEDALS[payout.rank] ?? `#${payout.rank}`}{" "}
                      </span>
                    )}
                    @{payout.creator_profiles.username}
                  </span>
                  <span className="badge">
                    {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                  </span>
                </span>
                <span className="shrink-0 font-display text-lg font-extrabold text-accent-ink">
                  {payout.amount.toFixed(2)} €
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
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="font-display text-lg font-bold">
            Vérification anti-fraude
          </h2>
          {challenge.results_disputed_at ? (
            <p className="text-sm leading-relaxed text-muted">
              Signalement enregistré le{" "}
              {formatDateTimeFr(challenge.results_disputed_at)}. Les paiements
              en attente restent bloqués jusqu&apos;à vérification par Natan.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted">
                Les paiements en attente partent automatiquement{" "}
                {DISPUTE_WINDOW_HOURS} h après la finalisation, sauf
                signalement. Regarde les vidéos du top 3 ci-dessus : si des
                statistiques te semblent gonflées ou un lien bidon, signale-le
                avant cette échéance.
              </p>
              <DisputeForm challengeId={challenge.id} />
            </>
          )}
        </section>
      )}
    </main>
  );
}
