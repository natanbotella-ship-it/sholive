import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/format-date";

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
      <section className="border-b bg-gradient-to-b from-primary-soft/60 via-background to-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="badge badge-primary">
            Compétition vidéo locale — Lyon
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Les commerces lancent le challenge, les créateurs font le{" "}
            <span className="text-primary-ink">show</span>.
          </h1>
          <p className="max-w-2xl text-balance text-lg text-muted">
            La marketplace de compétition vidéo locale. Les commerces lyonnais
            lancent des challenges avec cagnotte à la clé, les créateurs
            filment et postent sur TikTok/Reels, les meilleures vidéos
            remportent la mise.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register?role=merchant" className="btn-primary px-6 py-3">
              Je suis un pro
            </Link>
            <Link href="/register?role=creator" className="btn-outline px-6 py-3">
              Je suis un créateur
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Challenges actifs à Lyon</h2>
          <Link href="/challenges" className="link text-sm">
            Voir tous les challenges
          </Link>
        </div>

        {!challenges || challenges.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun challenge actif pour le moment.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="flex h-full flex-col gap-2 card card-hover"
                >
                  <span className="font-semibold">{challenge.title}</span>
                  <span className="text-sm text-muted">
                    {challenge.merchant_profiles.business_name} —{" "}
                    {challenge.merchant_profiles.city}
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="text-lg font-bold text-primary-ink">
                      {challenge.prize_pool}€
                    </span>
                    <span className="text-xs text-muted">
                      jusqu&apos;au {formatDateFr(challenge.submission_deadline)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
