import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/format-date";

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

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">Challenges actifs</h1>

      <form className="flex gap-2 text-sm">
        <select
          name="city"
          defaultValue={city ?? ""}
          className="input"
        >
          <option value="">Toutes les villes</option>
          <option value="Lyon">Lyon</option>
        </select>
        <button type="submit" className="btn-outline btn-sm">
          Filtrer
        </button>
      </form>

      {!challenges || challenges.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun challenge actif pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {challenges.map((challenge) => (
            <li
              key={challenge.id}
              className="flex flex-col gap-1 card"
            >
              <Link
                href={`/challenges/${challenge.id}`}
                className="link font-semibold"
              >
                {challenge.title}
              </Link>
              <span className="text-sm text-muted">
                {challenge.merchant_profiles.business_name} —{" "}
                {challenge.merchant_profiles.city}
              </span>
              <span className="text-sm">
                Prize pool : {challenge.prize_pool}€
              </span>
              <span className="text-sm text-muted">
                Deadline : {formatDateFr(challenge.submission_deadline)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
