"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { eurosToCents } from "@/lib/money";

export type CheckoutState = {
  error?: string;
};

export async function createCheckoutSessionAction(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const challengeId = formData.get("challengeId");
  if (typeof challengeId !== "string" || !challengeId) {
    return { error: "Challenge introuvable" };
  }

  const supabase = createClient();
  // Rôle vérifié contre profiles.role (user_metadata est forgeable, cf. lib/auth).
  const auth = await getAuthenticatedUser(supabase);

  if (!auth || auth.role !== "merchant") {
    return { error: "Accès réservé aux comptes pro" };
  }

  // RLS restreint deja cette lecture au merchant proprietaire : si la row
  // revient, le challenge lui appartient forcement.
  const { data: challenge, error: fetchError } = await supabase
    .from("challenges")
    .select("id, title, prize_pool, status")
    .eq("id", challengeId)
    .single();

  if (fetchError || !challenge) {
    return { error: "Challenge introuvable" };
  }

  // "draft" (première tentative) ET "awaiting_payment" (tentative précédente
  // abandonnée/expirée sur la page Stripe) — sinon un challenge dont le pro a fermé
  // l'onglet Checkout sans payer restait bloqué en awaiting_payment pour toujours,
  // sans aucun moyen de relancer le paiement (pre-mortem 2026-07-06).
  if (challenge.status !== "draft" && challenge.status !== "awaiting_payment") {
    return { error: "Ce challenge ne peut plus être payé" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: eurosToCents(challenge.prize_pool),
            product_data: { name: `Prize pool — ${challenge.title}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/merchant/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/merchant/dashboard?checkout=cancelled`,
      metadata: { challenge_id: challenge.id },
    });
  } catch {
    return { error: "Impossible de créer la session de paiement Stripe" };
  }

  if (!session.url) {
    return { error: "Impossible de créer la session de paiement" };
  }

  // status et stripe_checkout_session_id sont des colonnes privilégiées (le client
  // authentifié n'a plus de grant update sur challenges — un merchant ne doit pas
  // pouvoir écrire un statut lui-même). Service role après les vérifications
  // d'ownership (lecture RLS) et de statut draft ci-dessus.
  await createAdminClient()
    .from("challenges")
    .update({
      stripe_checkout_session_id: session.id,
      status: "awaiting_payment",
    })
    .eq("id", challengeId)
    .in("status", ["draft", "awaiting_payment"]);

  redirect(session.url);
}
