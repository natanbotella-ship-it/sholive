import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { formatDateTimeFr } from "@/lib/format-date";

type Brief = {
  concept?: string;
  consignes?: string[];
  hashtags_obligatoires?: string[];
  exemples_inspiration?: string[];
};

// Détail challenge (refonte Nuit des Lumières 2026-07-07) — pattern fiche
// marketplace : contenu (brief) à gauche, carte récap sticky à droite avec la
// cagnotte en tête et le CTA, barre CTA fixe au-dessus des onglets sur mobile.
// Données et logique d'éligibilité (canParticipate) strictement inchangées ;
// seule addition : un lien d'inscription visible par les visiteurs anonymes
// (avant, un non-connecté ne voyait aucune action possible).
export default async function ChallengeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      "id, title, description, brief, prize_pool, prize_distribution, status, submission_deadline, vote_deadline, merchant_profiles!inner(business_name, city)",
    )
    .eq("id", params.id)
    .single();

  if (!challenge) {
    notFound();
  }

  const { count: submissionsCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", params.id);

  // Rôle vérifié contre profiles.role (user_metadata est forgeable, cf. lib/auth) :
  // cette page manquait à la revue de sécurité du 2026-07-05, seul endroit restant
  // à décider de l'affichage du bouton "Participer" sur un user_metadata.role
  // modifiable côté client par l'utilisateur lui-même.
  const authUser = await getAuthenticatedUser(supabase);

  const submissionDeadlinePassed =
    new Date(challenge.submission_deadline) <= new Date();
  // status === "active" : un challenge non payé (awaiting_payment) ou déjà en
  // vote/finalisé ne doit pas proposer de participer, même si sa deadline est future.
  const canParticipate =
    challenge.status === "active" &&
    authUser?.role === "creator" &&
    !submissionDeadlinePassed;

  // Visiteur non connecté sur un challenge encore ouvert : proposer l'inscription
  // (présentation uniquement — le bouton "Participer" réel reste sous canParticipate).
  const showSignupCta =
    challenge.status === "active" && !submissionDeadlinePassed && !authUser;

  const statusLabel =
    challenge.status === "active"
      ? submissionDeadlinePassed
        ? "Vote du commerce en cours"
        : "Ouvert aux vidéos"
      : challenge.status === "results_finalized"
        ? "Résultats publiés"
        : challenge.status === "refunded"
          ? "Annulé — cagnotte remboursée"
          : null;

  const brief = challenge.brief as Brief | null;
  const distribution = challenge.prize_distribution as Record<
    string,
    number
  > | null;

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 pb-28 sm:px-6 sm:pb-10">
        {/* En-tête */}
        <div className="flex flex-col gap-2">
          {statusLabel && <span className="badge">{statusLabel}</span>}
          <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {challenge.title}
          </h1>
          <p className="text-sm text-muted">
            {challenge.merchant_profiles.business_name} ·{" "}
            {challenge.merchant_profiles.city}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* Carte récap — l'argent d'abord (premier dans le DOM : en tête sur mobile) */}
          <aside className="card flex flex-col gap-4 p-5 lg:sticky lg:top-20 lg:order-2">
            <div className="rounded-xl bg-accent-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-ink">
                Cagnotte
              </p>
              <p className="font-display text-3xl font-black text-accent-ink">
                {challenge.prize_pool} €
              </p>
              {distribution && (
                <p className="mt-1 text-xs font-medium text-accent-ink">
                  🥇 {distribution["1"]} % · 🥈 {distribution["2"]} % · 🥉{" "}
                  {distribution["3"]} % (sur le net, après commission)
                </p>
              )}
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Vidéos jusqu&apos;au</dt>
                <dd className="text-right font-semibold">
                  {formatDateTimeFr(challenge.submission_deadline)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Résultats au plus tard le</dt>
                <dd className="text-right font-semibold">
                  {formatDateTimeFr(challenge.vote_deadline)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Vidéos soumises</dt>
                <dd className="text-right font-semibold">
                  {submissionsCount ?? 0}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-muted">
              Moins de 10 vidéos à la deadline&nbsp;? Le challenge est annulé et
              le commerce intégralement remboursé.
            </p>
            {canParticipate && (
              <Link
                href={`/creator/submit/${challenge.id}`}
                className="btn-primary hidden w-full sm:inline-flex"
              >
                Participer au challenge
              </Link>
            )}
            {showSignupCta && (
              <Link
                href="/register?role=creator"
                className="btn-primary hidden w-full sm:inline-flex"
              >
                Créer un compte pour participer
              </Link>
            )}
          </aside>

          {/* Contenu : description + brief structuré */}
          <div className="flex flex-col gap-6 lg:order-1">
            {challenge.description && (
              <p className="text-base leading-relaxed">{challenge.description}</p>
            )}

            {brief && (
              <section className="card flex flex-col gap-5 p-5">
                <h2 className="font-display text-xl font-bold">
                  Le brief du commerce
                </h2>
                {brief.concept && (
                  <p className="text-sm leading-relaxed">{brief.concept}</p>
                )}
                {brief.consignes && brief.consignes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">À respecter</h3>
                    <ul className="flex flex-col gap-2">
                      {brief.consignes.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-sm">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                            className="mt-0.5 shrink-0 text-accent-ink"
                          >
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                          <span className="leading-relaxed">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.hashtags_obligatoires &&
                  brief.hashtags_obligatoires.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold">
                        Hashtags obligatoires
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {brief.hashtags_obligatoires.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary-soft px-3 py-1 text-xs font-semibold text-secondary-ink"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {brief.exemples_inspiration &&
                  brief.exemples_inspiration.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold">Inspirations</h3>
                      <ul className="flex list-inside list-disc flex-col gap-1 text-sm text-muted">
                        {brief.exemples_inspiration.map((ex) => (
                          <li key={ex} className="break-all">
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </section>
            )}

            {submissionDeadlinePassed && challenge.status === "active" && (
              <p className="text-sm text-muted">
                Les soumissions sont fermées — le commerce départage
                actuellement le top 10.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Barre CTA mobile, fixée au-dessus des onglets */}
      {(canParticipate || showSignupCta) && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-surface/95 px-4 py-3 backdrop-blur sm:hidden">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="shrink-0">
              <p className="text-xs text-muted">Cagnotte</p>
              <p className="font-display text-lg font-extrabold leading-tight text-accent-ink">
                {challenge.prize_pool} €
              </p>
            </div>
            {canParticipate ? (
              <Link
                href={`/creator/submit/${challenge.id}`}
                className="btn-primary flex-1"
              >
                Participer
              </Link>
            ) : (
              <Link href="/register?role=creator" className="btn-primary flex-1">
                Créer un compte pour participer
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
