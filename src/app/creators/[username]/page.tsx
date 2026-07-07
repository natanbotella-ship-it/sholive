import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Profil public créateur (refonte Nuit des Lumières 2026-07-07) — c'est la
// vitrine qu'un créateur partage : bandeau nuit façon profil de réseau social,
// stats en tuiles, badges dorés (registre récompense), victoires avec trophée.
// Requêtes et logique de badges inchangées.
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
    <main className="flex flex-1 flex-col">
      {/* Bandeau nuit — vitrine du créateur */}
      <section className="section-night border-b border-night-border">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6">
          {creatorProfile.avatar_url ? (
            <Image
              src={creatorProfile.avatar_url}
              alt={creatorProfile.username}
              width={88}
              height={88}
              className="h-22 w-22 rounded-full border-2 border-accent object-cover"
              style={{ height: 88, width: 88 }}
            />
          ) : (
            <div
              aria-hidden
              className="flex items-center justify-center rounded-full border-2 border-accent bg-night-surface font-display text-3xl font-extrabold text-night-fg"
              style={{ height: 88, width: 88 }}
            >
              {creatorProfile.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              @{creatorProfile.username}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-contrast">
              Niveau {creatorProfile.level}
            </span>
          </div>
          <dl className="flex gap-8 text-center">
            <div>
              <dd className="font-display text-2xl font-extrabold text-accent">
                {creatorProfile.xp}
              </dd>
              <dt className="text-xs font-medium text-night-muted">XP</dt>
            </div>
            <div>
              <dd className="font-display text-2xl font-extrabold">
                {creatorProfile.wins}
              </dd>
              <dt className="text-xs font-medium text-night-muted">
                victoire{creatorProfile.wins > 1 ? "s" : ""}
              </dt>
            </div>
            <div>
              <dd className="font-display text-2xl font-extrabold">
                {submissionsCount ?? 0}
              </dd>
              <dt className="text-xs font-medium text-night-muted">
                participation{(submissionsCount ?? 0) > 1 ? "s" : ""}
              </dt>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Badges</h2>
          {badges.length === 0 ? (
            <p className="text-sm text-muted">
              Aucun badge pour l&apos;instant — le premier tombe dès la première
              participation.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <li key={badge.label} className="badge-gold badge">
                  ★ {badge.label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Challenges gagnés</h2>
          {!victories || victories.length === 0 ? (
            <p className="text-sm text-muted">
              Aucune victoire pour l&apos;instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {victories.map((victory) => (
                <li
                  key={victory.id}
                  className="card flex items-center gap-3 p-4 text-sm"
                >
                  <span aria-hidden className="text-xl">
                    🏆
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-base font-bold">
                      {victory.challenges.title}
                    </span>
                    <span className="truncate text-muted">
                      {victory.challenges.merchant_profiles.business_name}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
