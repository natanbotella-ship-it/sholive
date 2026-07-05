import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MerchantOnboardingForm } from "./merchant-onboarding-form";

export default async function MerchantOnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("merchant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      redirect("/merchant/dashboard");
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary-ink">
        Complète ton profil pro
      </h1>
      <MerchantOnboardingForm />
    </main>
  );
}
