import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTimeFr } from "@/lib/format-date";
import { SubmissionForm } from "./submission-form";

// Page de soumission (refonte Nuit des Lumières 2026-07-07) — états de garde
// en cartes neutres avec porte de sortie (pas d'alerte rouge anxiogène pour un
// simple état), formulaire en sections. Données et gardes inchangées.
export default async function SubmitPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title, status, submission_deadline")
    .eq("id", params.id)
    .single();

  if (!challenge) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!creatorProfile) {
    redirect("/creator/onboarding");
  }

  const deadlinePassed =
    new Date(challenge.submission_deadline) <= new Date();

  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("challenge_id", challenge.id)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  const blockedMessage =
    challenge.status !== "active"
      ? "Ce challenge n'est pas ouvert aux soumissions."
      : deadlinePassed
        ? "La deadline est passée — les soumissions sont fermées pour ce challenge."
        : existingSubmission
          ? "Tu as déjà soumis ta vidéo pour ce challenge. Une seule participation par créateur."
          : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Participer au challenge</p>
        <h1 className="text-balance font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {challenge.title}
        </h1>
        {!blockedMessage && (
          <p className="text-sm text-muted">
            Vidéos acceptées jusqu&apos;au{" "}
            {formatDateTimeFr(challenge.submission_deadline)}.
          </p>
        )}
      </div>

      {blockedMessage ? (
        <div className="card flex flex-col items-start gap-3 p-6">
          <p className="text-sm leading-relaxed text-muted">{blockedMessage}</p>
          <Link href="/challenges" className="btn-primary">
            Voir les autres challenges
          </Link>
        </div>
      ) : (
        <SubmissionForm challengeId={challenge.id} />
      )}
    </main>
  );
}
