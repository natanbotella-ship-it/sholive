import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { formatDateTimeFr } from "@/lib/format-date";

type Brief = {
  concept?: string;
  consignes?: string[];
  hashtags_obligatoires?: string[];
  exemples_inspiration?: string[];
};

export default async function ChallengeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      "id, title, description, brief, prize_pool, prize_distribution, status, submission_deadline, vote_deadline, merchant_profiles!inner(business_name, city)",
    )
    .eq("id", params.id)
    .single();

  if (!challenge) {
    notFound();
  }

  const { count: submissionsCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", params.id);

  // Rôle vérifié contre profiles.role (user_metadata est forgeable, cf. lib/auth) :
  // cette page manquait à la revue de sécurité du 2026-07-05, seul endroit restant
  // à décider de l'affichage du bouton "Participer" sur un user_metadata.role
  // modifiable côté client par l'utilisateur lui-même.
  const authUser = await getAuthenticatedUser(supabase);

  const submissionDeadlinePassed =
    new Date(challenge.submission_deadline) <= new Date();
  // status === "active" : un challenge non payé (awaiting_payment) ou déjà en
  // vote/finalisé ne doit pas proposer de participer, même si sa deadline est future.
  const canParticipate =
    challenge.status === "active" &&
    authUser?.role === "creator" &&
    !submissionDeadlinePassed;

  const brief = challenge.brief as Brief | null;
  const distribution = challenge.prize_distribution as Record<
    string,
    number
  > | null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">{challenge.title}</h1>
      <p className="text-sm text-muted">
        {challenge.merchant_profiles.business_name} —{" "}
        {challenge.merchant_profiles.city}
      </p>

      <p className="text-sm">{challenge.description}</p>

      {brief && (
        <section className="flex flex-col gap-2 card text-sm">
          <h2 className="font-semibold">Brief</h2>
          {brief.concept && <p>{brief.concept}</p>}
          {brief.consignes && brief.consignes.length > 0 && (
            <div>
              <p className="font-medium">Consignes :</p>
              <ul className="list-inside list-disc">
                {brief.consignes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {brief.hashtags_obligatoires &&
            brief.hashtags_obligatoires.length > 0 && (
              <p>
                Hashtags obligatoires :{" "}
                {brief.hashtags_obligatoires.join(" ")}
              </p>
            )}
          {brief.exemples_inspiration &&
            brief.exemples_inspiration.length > 0 && (
              <div>
                <p className="font-medium">Inspirations :</p>
                <ul className="list-inside list-disc">
                  {brief.exemples_inspiration.map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}
        </section>
      )}

      <div className="flex flex-col gap-1 text-sm">
        <span>Prize pool : {challenge.prize_pool}€</span>
        {distribution && (
          <span>
            Répartition : 1er {distribution["1"]}% · 2e {distribution["2"]}%
            · 3e {distribution["3"]}%
          </span>
        )}
        <span>
          Date limite de soumission :{" "}
          {formatDateTimeFr(challenge.submission_deadline)}
        </span>
        <span>
          Date limite de vote :{" "}
          {formatDateTimeFr(challenge.vote_deadline)}
        </span>
        <span>{submissionsCount ?? 0} soumission(s) pour l&apos;instant</span>
      </div>

      {canParticipate && (
        <Link
          href={`/creator/submit/${challenge.id}`}
          className="btn-primary w-fit"
        >
          Participer
        </Link>
      )}
    </main>
  );
}
