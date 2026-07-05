import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";
import { ONBOARDING_STATUS_LABELS } from "@/lib/onboarding-status";
import { PAYOUT_STATUS_LABELS } from "@/lib/payout-status";

export default async function CreatorDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id, username, xp, level, wins, stripe_onboarding_status")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!creatorProfile) {
    redirect("/creator/onboarding");
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, rank, total_score, created_at, challenges!inner(id, title, status)",
    )
    .eq("creator_id", creatorProfile.id)
    .order("created_at", { ascending: false });

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, status, challenges!inner(title)")
    .eq("creator_id", creatorProfile.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">
          Espace créateur — @{creatorProfile.username}
        </h1>
        <Link
          href="/creator/profile"
          className="text-sm text-primary underline"
        >
          Modifier mon profil
        </Link>
      </div>

      <p className="text-sm text-foreground/60">
        {creatorProfile.level} · {creatorProfile.xp} XP ·{" "}
        {creatorProfile.wins} victoire{creatorProfile.wins > 1 ? "s" : ""}
      </p>

      <section className="flex flex-col gap-2 rounded-md border p-4">
        <h2 className="text-lg font-semibold">Paiements</h2>
        <p className="text-sm">
          {ONBOARDING_STATUS_LABELS[creatorProfile.stripe_onboarding_status] ??
            creatorProfile.stripe_onboarding_status}
        </p>
        {creatorProfile.stripe_onboarding_status !== "complete" && (
          <Link
            href="/creator/payments"
            className="w-fit text-sm text-primary underline"
          >
            Activer mes paiements
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Mes soumissions ({submissions?.length ?? 0})
        </h2>
        {!submissions || submissions.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucune soumission pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="flex flex-col gap-1 rounded-md border p-3 text-sm"
              >
                <Link
                  href={`/challenges/${submission.challenges.id}`}
                  className="font-semibold text-primary underline"
                >
                  {submission.challenges.title}
                </Link>
                <span className="text-foreground/60">
                  {CHALLENGE_STATUS_LABELS[submission.challenges.status] ??
                    submission.challenges.status}
                  {submission.rank !== null &&
                    ` · Rang #${submission.rank} (${Number(submission.total_score).toFixed(1)}/100)`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Historique des payouts</h2>
        {!payouts || payouts.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun payout pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-col gap-1 rounded-md border p-3 text-sm"
              >
                <span className="font-semibold">
                  {payout.challenges.title} — {payout.amount.toFixed(2)}€
                </span>
                <span className="text-foreground/60">
                  {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
