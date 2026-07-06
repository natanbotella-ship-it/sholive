import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";
import { formatDateTimeFr } from "@/lib/format-date";

// Dashboard pro (refonte Nuit des Lumières 2026-07-07) — une seule action
// rouge (Nouveau challenge), cartes de challenge scannables : statut lisible,
// cagnotte en doré, deadline. Requêtes Supabase inchangées.

// Couleur de badge par statut (présentation uniquement — labels partagés
// dans lib/challenge-status).
function statusBadgeClass(status: string): string {
  if (status === "active") return "badge badge-primary";
  if (status === "refunded") return "inline-flex w-fit items-center rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger";
  return "badge";
}

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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Espace pro</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Mes challenges
          </h1>
        </div>
        <Link href="/merchant/challenges/new" className="btn-primary">
          Nouveau challenge
        </Link>
      </div>

      {!challenges || challenges.length === 0 ? (
        <div className="card flex flex-col items-start gap-2 p-6">
          <p className="font-semibold">Lance ton premier challenge.</p>
          <p className="text-sm leading-relaxed text-muted">
            Décris ce que tu veux montrer de ton commerce, mets une cagnotte en
            jeu (à partir de 200 €), et les créateurs lyonnais s&apos;occupent
            du reste. S&apos;il y a moins de 10 vidéos, tu es intégralement
            remboursé.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <Link
                href={`/merchant/challenges/${challenge.id}`}
                className="card card-hover flex flex-col gap-3 text-sm"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-base font-bold">
                    {challenge.title}
                  </span>
                  <span className={statusBadgeClass(challenge.status)}>
                    {CHALLENGE_STATUS_LABELS[challenge.status] ??
                      challenge.status}
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent-ink">
                    {challenge.prize_pool} € de cagnotte
                  </span>
                  <span className="text-xs font-medium text-muted">
                    Vidéos jusqu&apos;au{" "}
                    {formatDateTimeFr(challenge.submission_deadline)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
