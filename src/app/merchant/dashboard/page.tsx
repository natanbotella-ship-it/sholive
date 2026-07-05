import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";
import { formatDateTimeFr } from "@/lib/format-date";

export default async function MerchantDashboardPage() {
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

  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, title, status, prize_pool, submission_deadline")
    .eq("merchant_id", merchantProfile.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-ink">Mes challenges</h1>
        <Link
          href="/merchant/challenges/new"
          className="btn-primary"
        >
          Nouveau challenge
        </Link>
      </div>

      {!challenges || challenges.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun challenge pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <Link
                href={`/merchant/challenges/${challenge.id}`}
                className="flex flex-col gap-2 card card-hover text-sm"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{challenge.title}</span>
                  <span className="badge">
                    {CHALLENGE_STATUS_LABELS[challenge.status] ??
                      challenge.status}
                  </span>
                </span>
                <span className="text-muted">
                  Prize pool{" "}
                  <span className="font-semibold text-primary-ink">
                    {challenge.prize_pool}€
                  </span>
                </span>
                <span className="text-muted">
                  Deadline soumission :{" "}
                  {formatDateTimeFr(challenge.submission_deadline)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
