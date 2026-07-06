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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Espace pro</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Créer un challenge
        </h1>
        <p className="text-sm text-muted">
          Plus ton brief est précis, plus les vidéos ressembleront à ce que tu
          imagines. Le challenge ne sera visible qu&apos;une fois la cagnotte
          payée.
        </p>
      </div>
      <ChallengeForm />
    </main>
  );
}
