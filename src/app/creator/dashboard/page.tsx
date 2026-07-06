import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";
import { ONBOARDING_STATUS_LABELS } from "@/lib/onboarding-status";
import { PAYOUT_STATUS_LABELS } from "@/lib/payout-status";

// Dashboard créateur (refonte Nuit des Lumières 2026-07-07) — gratification
// visible d'abord (tuiles niveau/XP/victoires), état des paiements avec action
// dorée (registre argent), soumissions avec médailles de rang, payouts en
// montants dorés. Requêtes Supabase inchangées.

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function CreatorDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id, username, xp, level, wins, stripe_onboarding_status")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!creatorProfile) {
    redirect("/creator/onboarding");
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, rank, total_score, created_at, challenges!inner(id, title, status)",
    )
    .eq("creator_id", creatorProfile.id)
    .order("created_at", { ascending: false });

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, status, challenges!inner(title)")
    .eq("creator_id", creatorProfile.id)
    .order("created_at", { ascending: false });

  const paymentsReady = creatorProfile.stripe_onboarding_status === "complete";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Espace créateur</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            @{creatorProfile.username}
          </h1>
        </div>
        <Link href="/creator/profile" className="btn-outline btn-sm">
          Modifier mon profil
        </Link>
      </div>

      {/* Gratification d'abord : niveau / XP / victoires */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card flex flex-col gap-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Niveau
          </p>
          <p className="font-display text-xl font-extrabold sm:text-2xl">
            {creatorProfile.level}
          </p>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            XP
          </p>
          <p className="font-display text-xl font-extrabold text-accent-ink sm:text-2xl">
            {creatorProfile.xp}
          </p>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Victoires
          </p>
          <p className="font-display text-xl font-extrabold sm:text-2xl">
            {creatorProfile.wins}
          </p>
        </div>
      </div>

      {/* Paiements — action dorée (registre argent) tant que non activés */}
      <section
        className={`card flex flex-col gap-3 p-5 ${paymentsReady ? "" : "border-accent/60"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold">Mes paiements</h2>
            <p className="text-sm text-muted">
              {ONBOARDING_STATUS_LABELS[creatorProfile.stripe_onboarding_status] ??
                creatorProfile.stripe_onboarding_status}
            </p>
          </div>
          {paymentsReady && (
            <span className="badge-gold badge shrink-0">Prêt à recevoir</span>
          )}
        </div>
        {!paymentsReady && (
          <>
            <p className="text-xs leading-relaxed text-muted">
              Nécessaire pour recevoir tes gains : identité + IBAN via le
              formulaire sécurisé Stripe, environ 5 minutes. Si tu gagnes avant
              de l&apos;avoir fait, ton paiement t&apos;attend et part dès que
              c&apos;est activé.
            </p>
            <Link href="/creator/payments" className="btn-accent w-fit">
              Activer mes paiements
            </Link>
          </>
        )}
      </section>

      {/* Soumissions */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">
          Mes soumissions{" "}
          <span className="text-muted">({submissions?.length ?? 0})</span>
        </h2>
        {!submissions || submissions.length === 0 ? (
          <div className="card flex flex-col items-start gap-3 p-5">
            <p className="text-sm text-muted">
              Tu n&apos;as encore participé à aucun challenge. Choisis-en un,
              filme, et tente ta part de la cagnotte.
            </p>
            <Link href="/challenges" className="btn-primary">
              Voir les challenges ouverts
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {submissions.map((submission) => (
              <li key={submission.id}>
                <Link
                  href={`/challenges/${submission.challenges.id}`}
                  className="card card-hover flex items-center justify-between gap-3 p-4 text-sm"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-semibold">
                      {submission.challenges.title}
                    </span>
                    <span className="badge">
                      {CHALLENGE_STATUS_LABELS[submission.challenges.status] ??
                        submission.challenges.status}
                    </span>
                  </span>
                  {submission.rank !== null && (
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-display text-lg font-extrabold">
                        {RANK_MEDALS[submission.rank] ?? "#"}
                        {submission.rank > 3 ? submission.rank : ""}
                        {submission.rank <= 3 ? ` ${submission.rank}ᵉ` : ""}
                      </span>
                      <span className="text-xs text-muted">
                        {Number(submission.total_score).toFixed(1)}/100
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payouts */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Mes gains</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun gain pour l&apos;instant — ta première victoire s&apos;affichera
            ici.
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
                    {payout.challenges.title}
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
    </main>
  );
}
