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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="badge mb-2">Dernière étape</span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Présente ton commerce
            </h1>
            <p className="text-sm text-muted">
              Ces informations apparaîtront sur tes challenges pour que les
              créateurs sachent chez qui ils viennent filmer.
            </p>
          </div>
          <MerchantOnboardingForm />
        </div>
      </div>
    </main>
  );
}
