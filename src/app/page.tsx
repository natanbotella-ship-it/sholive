import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/format-date";

// Landing (refonte Nuit des Lumières 2026-07-07) — parcours zéro friction :
// héro nuit immersif, la valeur d'abord (challenges actifs cliquables sans
// compte, comme une liste de restos), puis "comment ça marche" en 3 étapes
// par audience, bande confiance côté pro, CTA final. Une seule action rouge
// par écran. Requête Supabase inchangée.

const trustPoints = [
  {
    title: "Cagnotte sécurisée",
    text: "Payée d'avance via Stripe avant l'ouverture du challenge. Jamais de promesse en l'air.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    title: "Gagnants payés directement",
    text: "Après validation des résultats, le virement part automatiquement sur le compte des gagnants.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2Z" />
      </svg>
    ),
  },
  {
    title: "Remboursé si ça ne décolle pas",
    text: "Moins de 10 vidéos reçues ? Le commerce est remboursé intégralement, commission comprise.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3a9 9 0 1 1-8.6 6.3" />
        <path d="M3 4v5h5" />
      </svg>
    ),
  },
];

const creatorSteps = [
  "Choisis un challenge près de chez toi et lis le brief du commerce.",
  "Filme, monte, poste sur TikTok ou Reels, puis soumets le lien de ta vidéo.",
  "Les meilleures vidéos remportent leur part de la cagnotte, payée par virement.",
];

const merchantSteps = [
  "Lance un challenge avec ta cagnotte (dès 200 €) et décris ce que tu veux montrer.",
  "Les créateurs lyonnais filment ton commerce et publient sur leurs réseaux.",
  "Tu choisis ta vidéo préférée dans le top 10 — on paie les gagnants pour toi.",
];

export default async function Home() {
  const supabase = createClient();

  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, title, prize_pool, submission_deadline, merchant_profiles!inner(business_name, city)",
    )
    .eq("status", "active")
    .gt("submission_deadline", new Date().toISOString())
    .order("submission_deadline", { ascending: true })
    .limit(3);

  return (
    <main className="flex flex-1 flex-col">
      {/* Héro nuit — halos dorés/rouges façon Fête des Lumières */}
      <section className="section-night relative overflow-hidden border-b border-night-border">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-secondary-soft/10 blur-3xl" />
        </div>
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-night-border bg-night-surface px-3 py-1 text-xs font-semibold text-night-muted">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            Compétition vidéo locale — 100 % Lyon
          </span>
          <h1 className="max-w-3xl text-balance font-display text-4xl font-black tracking-tight sm:text-6xl">
            Les commerces lancent le challenge, les créateurs font le{" "}
            <span className="text-accent">show</span>.
          </h1>
          <p className="max-w-2xl text-balance text-lg text-night-muted">
            Les commerces lyonnais mettent une cagnotte en jeu. Les créateurs
            filment, postent sur TikTok ou Reels, et les meilleures vidéos
            remportent la mise.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/challenges" className="btn-primary px-6 py-3 text-base">
              Découvrir les challenges
            </Link>
            <Link
              href="/register?role=merchant"
              className="inline-flex items-center justify-center rounded-xl border border-night-border bg-night-surface/60 px-6 py-3 text-base font-semibold text-night-fg transition hover:bg-night-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Je suis commerçant
            </Link>
          </div>
          <p className="text-sm text-night-muted">
            Cagnottes dès 200 € · Paiements sécurisés par Stripe · Sans
            engagement
          </p>
        </div>
      </section>

      {/* La valeur d'abord : challenges en cours, consultables sans compte */}
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-12 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            En ce moment à Lyon
          </h2>
          <Link href="/challenges" className="link shrink-0 text-sm">
            Tout voir
          </Link>
        </div>

        {!challenges || challenges.length === 0 ? (
          <div className="card flex flex-col items-start gap-3 p-6">
            <p className="font-semibold">
              Les premiers challenges arrivent tout bientôt.
            </p>
            <p className="text-sm text-muted">
              Crée ton compte créateur maintenant pour être prêt à participer
              dès l&apos;ouverture — il n&apos;y a que quelques places sur le
              podium.
            </p>
            <Link href="/register?role=creator" className="btn-primary">
              Créer mon compte créateur
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="card card-hover flex h-full flex-col gap-3"
                >
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent-ink">
                    {challenge.prize_pool} € de cagnotte
                  </span>
                  <span className="font-display text-lg font-bold leading-snug">
                    {challenge.title}
                  </span>
                  <span className="text-sm text-muted">
                    {challenge.merchant_profiles.business_name} ·{" "}
                    {challenge.merchant_profiles.city}
                  </span>
                  <span className="mt-auto pt-1 text-xs font-medium text-muted">
                    Vidéos acceptées jusqu&apos;au{" "}
                    {formatDateFr(challenge.submission_deadline)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comment ça marche — 3 étapes par audience (ton hybride) */}
      <section className="border-t bg-surface/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-14 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Comment ça marche ?
            </h2>
            <Link href="/comment-ca-marche" className="link shrink-0 text-sm">
              Le guide complet
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card flex flex-col gap-4 p-6">
              <span className="badge badge-primary">Pour les créateurs</span>
              <ol className="flex flex-col gap-4">
                {creatorSteps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-contrast"
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-muted">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="card flex flex-col gap-4 p-6">
              <span className="badge">Pour les commerçants</span>
              <ol className="flex flex-col gap-4">
                {merchantSteps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-soft font-display text-sm font-bold text-secondary-ink"
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-muted">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Bande confiance (registre pro, sur nuit) */}
      <section className="section-night border-y border-night-border">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {trustPoints.map((point) => (
            <div key={point.title} className="flex flex-col gap-2">
              <span className="text-accent">{point.icon}</span>
              <h3 className="font-display text-base font-bold">{point.title}</h3>
              <p className="text-sm leading-relaxed text-night-muted">
                {point.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
        <h2 className="max-w-xl text-balance font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Prêt à faire le show ?
        </h2>
        <p className="max-w-md text-balance text-muted">
          Compte gratuit, inscription en 2 minutes. Il ne manque plus que toi.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/register?role=creator" className="btn-primary px-6 py-3 text-base">
            Créer mon compte créateur
          </Link>
          <Link href="/register?role=merchant" className="link text-sm">
            Je suis commerçant
          </Link>
        </div>
      </section>
    </main>
  );
}
