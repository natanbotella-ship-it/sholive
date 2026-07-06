import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/format-date";

// Liste des challenges (refonte Nuit des Lumières 2026-07-07) — pattern liste
// scannable façon livraison : chips de filtre en liens GET (mêmes searchParams,
// plus de bouton "Filtrer" à comprendre), grille de cartes cohérentes avec la
// landing, cagnotte dorée en premier. Requête Supabase inchangée.
export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const supabase = createClient();
  const city = searchParams.city;

  let query = supabase
    .from("challenges")
    .select(
      "id, title, prize_pool, submission_deadline, merchant_profiles!inner(business_name, city)",
    )
    .eq("status", "active")
    .gt("submission_deadline", new Date().toISOString())
    .order("submission_deadline", { ascending: true });

  if (city) {
    query = query.eq("merchant_profiles.city", city);
  }

  const { data: challenges } = await query;
  const count = challenges?.length ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Challenges ouverts
        </h1>
        <p className="text-sm text-muted">
          {count === 0
            ? "Choisis un challenge, filme, et remporte ta part de la cagnotte."
            : `${count} challenge${count > 1 ? "s" : ""} en cours — choisis, filme, remporte ta part de la cagnotte.`}
        </p>
      </div>

      {/* Filtres en chips-liens : un tap, zéro bouton à comprendre */}
      <nav aria-label="Filtrer par ville" className="flex flex-wrap gap-2">
        <Link
          href="/challenges"
          aria-current={!city ? "page" : undefined}
          className={`chip ${!city ? "chip-active" : ""}`}
        >
          Toutes les villes
        </Link>
        <Link
          href="/challenges?city=Lyon"
          aria-current={city === "Lyon" ? "page" : undefined}
          className={`chip ${city === "Lyon" ? "chip-active" : ""}`}
        >
          Lyon
        </Link>
      </nav>

      {!challenges || challenges.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-6">
          <p className="font-semibold">Aucun challenge ouvert pour le moment.</p>
          <p className="text-sm text-muted">
            Les commerces lyonnais préparent leurs prochains challenges. Crée
            ton compte créateur pour être prêt dès l&apos;ouverture.
          </p>
          <Link href="/register?role=creator" className="btn-primary">
            Créer mon compte créateur
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
  );
}
