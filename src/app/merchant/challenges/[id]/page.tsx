import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";
import { formatDateTimeFr } from "@/lib/format-date";

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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <Link
        href="/merchant/dashboard"
        className="link text-sm"
      >
        ← Mes challenges
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-primary-ink">{challenge.title}</h1>
        <span className="badge">
          {CHALLENGE_STATUS_LABELS[challenge.status] ?? challenge.status}
        </span>
      </div>
      <p className="text-sm text-muted">
        Prize pool :{" "}
        <span className="font-semibold text-primary-ink">
          {challenge.prize_pool}€
        </span>
      </p>
      <p className="text-sm text-muted">
        Deadline soumission : {formatDateTimeFr(challenge.submission_deadline)}
        {" · "}
        Deadline vote : {formatDateTimeFr(challenge.vote_deadline)}
      </p>

      <div className="flex flex-wrap gap-3">
        {(challenge.status === "active" || challenge.status === "voting") && (
          <Link
            href={`/merchant/challenges/${challenge.id}/vote`}
            className="btn-primary w-fit"
          >
            Voter sur les soumissions
          </Link>
        )}
        {challenge.status !== "draft" && challenge.status !== "awaiting_payment" && (
          <Link
            href={`/merchant/challenges/${challenge.id}/results`}
            className="btn-outline w-fit"
          >
            Voir les résultats
          </Link>
        )}
      </div>

      <h2 className="text-lg font-semibold">
        Soumissions ({submissions?.length ?? 0})
      </h2>

      {!submissions || submissions.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune soumission pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="flex flex-col gap-2 card text-sm"
            >
              <span className="font-semibold">
                @{submission.creator_profiles.username}
              </span>
              <span className="text-muted">
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
                    className="link"
                  >
                    TikTok
                  </a>
                )}
                {submission.reels_url && (
                  <a
                    href={submission.reels_url}
                    target="_blank"
                    rel="noreferrer"
                    className="link"
                  >
                    Reels
                  </a>
                )}
                {submission.shorts_url && (
                  <a
                    href={submission.shorts_url}
                    target="_blank"
                    rel="noreferrer"
                    className="link"
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
