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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="badge badge-primary mb-2">Dernière étape</span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Choisis ton nom de créateur
            </h1>
            <p className="text-sm text-muted">
              C&apos;est le nom que les commerces et les autres créateurs
              verront sur les classements.
            </p>
          </div>
          <CreatorOnboardingForm />
        </div>
      </div>
    </main>
  );
}
