import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/notify-admin";
import { eurosToCents } from "@/lib/money";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const challengeId = session.metadata?.challenge_id;

    if (challengeId) {
      const supabase = createAdminClient();
      // Stripe livre les événements au moins une fois (doublons/rejeux possibles) :
      // sans le filtre sur le statut, un rejeu tardif repasserait en "active" un
      // challenge déjà avancé (voting/results_finalized/refunded).
      // stripe_payment_intent_id (pre-mortem 2026-07-06) : capté ici pour servir de
      // source_transaction aux Transfers des gagnants (cf. cron de sweep), afin qu'ils
      // soient adossés au paiement de CE challenge plutôt qu'à la balance disponible
      // globale de la plateforme. mode "payment" -> le Payment Intent existe déjà à
      // la complétion du Checkout, pas besoin d'expand.
      await supabase
        .from("challenges")
        .update({
          payment_status: "paid",
          status: "active",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", challengeId)
        .eq("stripe_checkout_session_id", session.id)
        .eq("status", "awaiting_payment");
    }
  }

  // Repasse le challenge en "draft" si le pro n'a pas payé avant l'expiration de la
  // Checkout Session (24h par défaut chez Stripe) — pre-mortem 2026-07-06 : sans ça, un
  // paiement abandonné laissait le challenge bloqué en awaiting_payment. Le retry direct
  // depuis awaiting_payment (createCheckoutSessionAction) rend ce webhook non bloquant
  // pour relancer un paiement, mais garde le statut affiché cohérent avec la réalité.
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const challengeId = session.metadata?.challenge_id;

    if (challengeId) {
      const supabase = createAdminClient();
      await supabase
        .from("challenges")
        .update({ status: "draft", stripe_checkout_session_id: null })
        .eq("id", challengeId)
        .eq("stripe_checkout_session_id", session.id)
        .eq("status", "awaiting_payment");
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    // payouts_enabled, pas charges_enabled : le compte Connect est créé avec la
    // seule capability "transfers" (pas de card_payments), donc charges_enabled
    // ne passe jamais à true pour ces comptes — le statut n'aurait jamais atteint
    // "complete" et les payouts seraient restés bloqués en awaiting_onboarding.
    // payouts_enabled correspond exactement à "identité + IBAN validés, l'argent
    // peut atteindre le compte bancaire".
    const newStatus =
      account.details_submitted && account.payouts_enabled
        ? "complete"
        : account.requirements?.disabled_reason
          ? "restricted"
          : "pending";

    const supabase = createAdminClient();
    const { data: creatorProfile } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("stripe_account_id", account.id)
      .maybeSingle();

    if (creatorProfile) {
      await supabase
        .from("creator_profiles")
        .update({ stripe_onboarding_status: newStatus })
        .eq("id", creatorProfile.id);

      // Reprise des payouts restés en attente d'onboarding : c'est le seul mécanisme
      // qui débloque un payout resté `awaiting_onboarding` après `results_finalized` (bloc 15).
      if (newStatus === "complete") {
        const { data: pendingPayouts } = await supabase
          .from("payouts")
          .select("id, amount, challenge_id, creator_id")
          .eq("creator_id", creatorProfile.id)
          .eq("status", "awaiting_onboarding");

        for (const payout of pendingPayouts ?? []) {
          try {
            const transfer = await stripe.transfers.create(
              {
                amount: eurosToCents(Number(payout.amount)),
                currency: "eur",
                destination: account.id,
                // Permet aux webhooks transfer.created/transfer.failed de retrouver
                // le payout même si l'update ci-dessous n'a pas encore été écrit.
                metadata: { payout_id: payout.id },
              },
              {
                // Stripe livre les webhooks au moins une fois, parfois en parallèle :
                // deux account.updated concurrents lisent les mêmes payouts
                // awaiting_onboarding avant que l'un des deux ait écrit "pending".
                // La clé d'idempotence (par challenge + créateur, pas par row payout)
                // garantit qu'un seul Transfer réel est créé, Stripe renvoyant le
                // même objet au second appel.
                idempotencyKey: `payout-transfer-${payout.challenge_id}-${payout.creator_id}`,
              },
            );

            // Conditionné sur awaiting_onboarding : si le webhook transfer.created
            // est arrivé entre-temps et a déjà marqué le payout "paid", on ne le
            // rétrograde pas en "pending".
            await supabase
              .from("payouts")
              .update({ status: "pending", stripe_transfer_id: transfer.id })
              .eq("id", payout.id)
              .eq("status", "awaiting_onboarding");
          } catch (error) {
            // Pas de try/catch à l'origine (Bloc 11) : une exception faisait
            // échouer le webhook (500), Stripe retentant automatiquement — chaque
            // retry relit les payouts awaiting_onboarding, donc un retry ne
            // retente que ceux encore non résolus (idempotent par construction).
            // On garde ce comportement (rethrow après notification) : Natan est
            // alerté immédiatement au lieu de découvrir l'échec après plusieurs
            // retries silencieux dans les logs Vercel.
            await notifyAdmin(
              "Transfer Stripe échoué (reprise account.updated)",
              `Le Transfer de reprise pour le payout ${payout.id} (créateur ${creatorProfile.id}) a échoué : ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
          }
        }
      }
    }
  }

  // CLAUDE.md : transfer.created -> payout "paid", transfer.failed -> payout "failed".
  // "transfer.failed" n'existe plus dans les versions récentes de l'API Stripe (les
  // échecs asynchrones passent par des reversals), d'où la comparaison en string —
  // on le gère quand même conformément à la spec, au cas où.
  if (event.type === "transfer.created" || (event.type as string) === "transfer.failed") {
    const transfer = event.data.object as Stripe.Transfer;
    const newStatus = event.type === "transfer.created" ? "paid" : "failed";

    // Retrouve le payout par la metadata posée à la création du Transfer, à défaut
    // par stripe_transfer_id. Filtre sur les statuts non terminaux : un rejeu du
    // webhook ne doit pas écraser un état déjà paid/failed. "awaiting_onboarding"
    // est accepté car transfer.created peut arriver avant que notre propre code
    // ait écrit le passage en "pending".
    const supabase = createAdminClient();
    let query = supabase
      .from("payouts")
      .update({ status: newStatus, stripe_transfer_id: transfer.id })
      .in("status", ["awaiting_onboarding", "pending"]);
    query = transfer.metadata?.payout_id
      ? query.eq("id", transfer.metadata.payout_id)
      : query.eq("stripe_transfer_id", transfer.id);
    const { data: updated } = await query.select("id");

    if (newStatus === "failed" && updated && updated.length > 0) {
      await notifyAdmin(
        "Transfer Stripe échoué (webhook transfer.failed)",
        `Le Transfer ${transfer.id} (metadata payout_id=${transfer.metadata?.payout_id ?? "inconnu"}) est passé en échec après création.`,
      );
    }
  }

  return NextResponse.json({ received: true });
}
