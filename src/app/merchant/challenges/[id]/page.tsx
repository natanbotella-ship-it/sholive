import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <Link
        href="/merchant/dashboard"
        className="text-sm text-primary underline"
      >
        ← Mes challenges
      </Link>

      <h1 className="text-2xl font-bold text-primary">{challenge.title}</h1>
      <p className="text-sm text-foreground/60">
        {CHALLENGE_STATUS_LABELS[challenge.status] ?? challenge.status}
        {" — "}Prize pool {challenge.prize_pool}€
      </p>
      <p className="text-sm text-foreground/60">
        Deadline soumission :{" "}
        {new Date(challenge.submission_deadline).toLocaleString("fr-FR")}
        {" · "}
        Deadline vote :{" "}
        {new Date(challenge.vote_deadline).toLocaleString("fr-FR")}
      </p>

      <h2 className="text-lg font-semibold">
        Soumissions ({submissions?.length ?? 0})
      </h2>

      {!submissions || submissions.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucune soumission pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="flex flex-col gap-2 rounded-md border p-4 text-sm"
            >
              <span className="font-semibold">
                @{submission.creator_profiles.username}
              </span>
              <span className="text-foreground/60">
                {submission.declared_views} vues · {submission.declared_saves}{" "}
                saves · {submission.declared_likes} likes ·{" "}
                {submission.declared_shares} partages
              </span>
              <div className="flex flex-wrap gap-3">
                {submission.tiktok_url && (
                  <a
                    href={submission.tiktok_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    TikTok
                  </a>
                )}
                {submission.reels_url && (
                  <a
                    href={submission.reels_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Reels
                  </a>
                )}
                {submission.shorts_url && (
                  <a
                    href={submission.shorts_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Shorts
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
