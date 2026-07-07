import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";
import { formatDateTimeFr } from "@/lib/format-date";
import { PayButton } from "@/app/merchant/challenges/new/pay-button";

// Détail challenge côté pro (refonte Nuit des Lumières 2026-07-07) — un
// bandeau "et maintenant ?" par état, cagnotte en doré, soumissions avec
// stats lisibles et liens vidéo en chips. Requêtes, gardes et conditions
// d'affichage des actions strictement inchangées.
export default async function MerchantChallengeDetailPage({
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
      "id, title, status, prize_pool, submission_deadline, vote_deadline, merchant_id",
    )
    .eq("id", params.id)
    .single();

  if (!challenge || challenge.merchant_id !== merchantProfile.id) {
    notFound();
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, tiktok_url, reels_url, shorts_url, declared_views, declared_saves, declared_likes, declared_shares, creator_profiles!inner(username)",
    )
    .eq("challenge_id", challenge.id)
    .order("created_at", { ascending: true });

  const submissionCount = submissions?.length ?? 0;

  // Phrase de contexte par état — dérivée des mêmes champs que les actions.
  const contextText =
    challenge.status === "draft" || challenge.status === "awaiting_payment"
      ? "Ton challenge est invisible des créateurs tant que la cagnotte n'est pas payée."
      : challenge.status === "active" &&
          new Date(challenge.submission_deadline) > new Date()
        ? `Les créateurs peuvent soumettre leurs vidéos jusqu'au ${formatDateTimeFr(challenge.submission_deadline)}.`
        : challenge.status === "active" || challenge.status === "voting"
          ? `Les soumissions sont fermées — vote pour ton coup de cœur avant le ${formatDateTimeFr(challenge.vote_deadline)}.`
          : challenge.status === "results_finalized"
            ? "Les résultats sont publiés."
            : challenge.status === "refunded"
              ? "Challenge annulé (moins de 10 vidéos) — la cagnotte est intégralement remboursée."
              : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/merchant/dashboard" className="link w-fit text-sm">
        ← Mes challenges
      </Link>

      <div className="flex flex-col gap-2">
        <span className="badge">
          {CHALLENGE_STATUS_LABELS[challenge.status] ?? challenge.status}
        </span>
        <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight">
          {challenge.title}
        </h1>
        {contextText && <p className="text-sm text-muted">{contextText}</p>}
      </div>

      {/* Récap chiffres */}
      <div className="card flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Cagnotte
          </p>
          <p className="font-display text-2xl font-black text-accent-ink">
            {challenge.prize_pool} €
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Fin des soumissions
          </p>
          <p className="text-sm font-semibold">
            {formatDateTimeFr(challenge.submission_deadline)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Fin du vote
          </p>
          <p className="text-sm font-semibold">
            {formatDateTimeFr(challenge.vote_deadline)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Vidéos
          </p>
          <p className="text-sm font-semibold">{submissionCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* draft (jamais payé) ET awaiting_payment (paiement abandonné/expiré sur
            Stripe) — sinon un challenge resterait bloqué sans aucun moyen de payer
            une fois sorti de l'écran de création (pre-mortem 2026-07-06). */}
        {(challenge.status === "draft" || challenge.status === "awaiting_payment") && (
          <PayButton challengeId={challenge.id} />
        )}
        {(challenge.status === "active" || challenge.status === "voting") && (
          <Link
            href={`/merchant/challenges/${challenge.id}/vote`}
            className="btn-primary w-fit"
          >
            Voter pour mon coup de cœur
          </Link>
        )}
        {challenge.status !== "draft" && challenge.status !== "awaiting_payment" && (
          <Link
            href={`/merchant/challenges/${challenge.id}/results`}
            className="btn-outline w-fit"
          >
            Voir les résultats
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">
          Vidéos reçues <span className="text-muted">({submissionCount})</span>
        </h2>

        {!submissions || submissions.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            Aucune vidéo pour l&apos;instant. Rappel : il en faut au moins 10 à
            la deadline, sinon le challenge est annulé et tu es intégralement
            remboursé.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {submissions.map((submission) => (
              <li key={submission.id} className="card flex flex-col gap-3 text-sm">
                <span className="font-display text-base font-bold">
                  @{submission.creator_profiles.username}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted">Vues</p>
                    <p className="font-semibold">{submission.declared_views}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Sauvegardes</p>
                    <p className="font-semibold">{submission.declared_saves}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">J&apos;aime</p>
                    <p className="font-semibold">{submission.declared_likes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Partages</p>
                    <p className="font-semibold">{submission.declared_shares}</p>
                  </div>
                </div>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
