import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_STATUS_LABELS } from "@/lib/onboarding-status";
import { ActivatePaymentsButton } from "./activate-payments-button";

// Page paiements créateur (refonte Nuit des Lumières 2026-07-07) — registre
// argent : ce que l'activation implique, en toute transparence (formulaire
// hébergé Stripe, Sholive ne voit rien), action dorée. Logique inchangée.
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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-5 border-accent/60 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Mes paiements
            </h1>
            <p className="text-sm font-medium">
              {ONBOARDING_STATUS_LABELS[status] ?? status}
            </p>
          </div>

          {status === "complete" ? (
            <>
              <span className="badge-gold badge">Prêt à recevoir tes gains</span>
              <p className="text-sm leading-relaxed text-muted">
                Tes gains arrivent directement sur ton compte bancaire après la
                validation des résultats de chaque challenge. Rien d&apos;autre
                à faire.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted">
                Pour recevoir l&apos;argent de tes victoires, Stripe (notre
                partenaire de paiement) doit vérifier ton identité et ton IBAN.
                Ça se passe sur leur formulaire sécurisé — Sholive ne voit
                jamais tes documents.
              </p>
              <ol className="flex flex-col gap-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="font-display font-bold text-accent-ink">1.</span>
                  Prépare une pièce d&apos;identité et ton IBAN.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-display font-bold text-accent-ink">2.</span>
                  Remplis le formulaire Stripe (environ 5 minutes).
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-display font-bold text-accent-ink">3.</span>
                  Reviens ici — ton statut se met à jour automatiquement.
                </li>
              </ol>
              <ActivatePaymentsButton />
              <p className="text-xs leading-relaxed text-muted">
                Si tu gagnes un challenge avant d&apos;avoir activé tes
                paiements, ton gain t&apos;attend et part dès que c&apos;est
                fait.
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/creator/dashboard" className="link">
            Retour à mon espace
          </Link>
        </p>
      </div>
    </main>
  );
}
