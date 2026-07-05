import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmissionForm } from "./submission-form";

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

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">
        Participer : {challenge.title}
      </h1>

      {challenge.status !== "active" ? (
        <p className="alert-error">
          Ce challenge n&apos;est pas ouvert aux soumissions.
        </p>
      ) : deadlinePassed ? (
        <p className="alert-error">
          La deadline de soumission pour ce challenge est dépassée.
        </p>
      ) : existingSubmission ? (
        <p className="text-sm">
          Tu as déjà soumis une vidéo pour ce challenge.
        </p>
      ) : (
        <SubmissionForm challengeId={challenge.id} />
      )}
    </main>
  );
}
