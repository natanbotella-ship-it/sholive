import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_STATUS_LABELS } from "@/lib/challenge-status";

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Mes challenges</h1>
        <Link
          href="/merchant/challenges/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Nouveau challenge
        </Link>
      </div>

      {!challenges || challenges.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucun challenge pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <Link
                href={`/merchant/challenges/${challenge.id}`}
                className="flex flex-col gap-1 rounded-md border p-4 text-sm hover:border-primary"
              >
                <span className="font-semibold">{challenge.title}</span>
                <span className="text-foreground/60">
                  {CHALLENGE_STATUS_LABELS[challenge.status] ?? challenge.status}
                  {" — "}Prize pool {challenge.prize_pool}€
                </span>
                <span className="text-foreground/60">
                  Deadline soumission :{" "}
                  {new Date(challenge.submission_deadline).toLocaleString(
                    "fr-FR",
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
