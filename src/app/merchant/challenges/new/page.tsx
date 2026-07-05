import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChallengeForm } from "./challenge-form";

export default async function NewChallengePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: merchantProfile } = await supabase
      .from("merchant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!merchantProfile) {
      redirect("/merchant/onboarding");
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">Créer un challenge</h1>
      <ChallengeForm />
    </main>
  );
}
