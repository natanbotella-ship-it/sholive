import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
      await supabase
        .from("challenges")
        .update({ payment_status: "paid", status: "active" })
        .eq("id", challengeId)
        .eq("stripe_checkout_session_id", session.id);
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    const newStatus =
      account.details_submitted && account.charges_enabled
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
          .select("id, amount")
          .eq("creator_id", creatorProfile.id)
          .eq("status", "awaiting_onboarding");

        for (const payout of pendingPayouts ?? []) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(Number(payout.amount) * 100),
            currency: "eur",
            destination: account.id,
          });

          await supabase
            .from("payouts")
            .update({ status: "pending", stripe_transfer_id: transfer.id })
            .eq("id", payout.id);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
