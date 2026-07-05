import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    <main className="flex min-h-screen flex-col gap-16 p-8">
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-16 text-center">
        <h1 className="text-4xl font-bold text-primary">Sholive</h1>
        <p className="text-lg text-foreground/60">
          La marketplace de compétition vidéo locale. Les commerces lyonnais
          lancent des challenges avec cagnotte à la clé, les créateurs filment
          et postent sur TikTok/Reels, les meilleures vidéos remportent la
          mise.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/register?role=merchant"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white"
          >
            Je suis un pro
          </Link>
          <Link
            href="/register?role=creator"
            className="rounded-md border border-primary px-6 py-3 text-sm font-medium text-primary"
          >
            Je suis un créateur
          </Link>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Challenges actifs à Lyon</h2>
          <Link href="/challenges" className="text-sm text-primary underline">
            Voir tous les challenges
          </Link>
        </div>

        {!challenges || challenges.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun challenge actif pour le moment.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="flex h-full flex-col gap-1 rounded-md border p-4 hover:border-primary"
                >
                  <span className="font-semibold">{challenge.title}</span>
                  <span className="text-sm text-foreground/60">
                    {challenge.merchant_profiles.business_name} —{" "}
                    {challenge.merchant_profiles.city}
                  </span>
                  <span className="text-sm">
                    Prize pool : {challenge.prize_pool}€
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
