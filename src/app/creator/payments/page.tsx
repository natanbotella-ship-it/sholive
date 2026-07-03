import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActivatePaymentsButton } from "./activate-payments-button";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Paiements non activés",
  pending: "Onboarding en cours de vérification par Stripe",
  complete: "Paiements activés",
  restricted:
    "Compte restreint par Stripe — informations supplémentaires requises",
};

export default async function CreatorPaymentsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("stripe_onboarding_status")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!creatorProfile) {
    redirect("/creator/onboarding");
  }

  const status = creatorProfile.stripe_onboarding_status;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary">Mes paiements</h1>

      <p className="text-sm">{STATUS_LABELS[status] ?? status}</p>

      {status === "complete" ? (
        <p className="text-sm text-foreground/60">
          Tu peux recevoir tes gains directement sur ton compte bancaire.
        </p>
      ) : (
        <ActivatePaymentsButton />
      )}

      <Link
        href="/creator/dashboard"
        className="text-sm text-primary underline"
      >
        Retour au dashboard
      </Link>
    </main>
  );
}
