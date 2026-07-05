import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorPublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id, username, avatar_url, xp, level, wins")
    .eq("username", params.username.toLowerCase())
    .maybeSingle();

  if (!creatorProfile) {
    notFound();
  }

  const { count: submissionsCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorProfile.id);

  const badges = [
    { label: "Premier challenge", earned: (submissionsCount ?? 0) >= 1 },
    { label: "Première victoire", earned: creatorProfile.wins >= 1 },
    { label: "3 victoires", earned: creatorProfile.wins >= 3 },
    { label: "10 soumissions", earned: (submissionsCount ?? 0) >= 10 },
  ].filter((b) => b.earned);

  const { data: victories } = await supabase
    .from("submissions")
    .select(
      "id, created_at, challenges!inner(title, merchant_profiles!inner(business_name))",
    )
    .eq("creator_id", creatorProfile.id)
    .eq("rank", 1)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center gap-4">
        {creatorProfile.avatar_url ? (
          <Image
            src={creatorProfile.avatar_url}
            alt={creatorProfile.username}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-contrast">
            {creatorProfile.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-primary-ink">
            @{creatorProfile.username}
          </h1>
          <p className="text-sm text-muted">
            {creatorProfile.level} · {creatorProfile.xp} XP ·{" "}
            {creatorProfile.wins} victoire
            {creatorProfile.wins > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Badges</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-muted">Aucun badge pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <li
                key={badge.label}
                className="badge"
              >
                {badge.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Challenges gagnés</h2>
        {!victories || victories.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune victoire pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {victories.map((victory) => (
              <li
                key={victory.id}
                className="flex flex-col gap-1 card p-3 text-sm"
              >
                <span className="font-semibold">
                  {victory.challenges.title}
                </span>
                <span className="text-muted">
                  {victory.challenges.merchant_profiles.business_name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
