import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorOnboardingForm } from "./creator-onboarding-form";

export default async function CreatorOnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      redirect("/creator/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary">
        Complète ton profil créateur
      </h1>
      <CreatorOnboardingForm />
    </main>
  );
}
