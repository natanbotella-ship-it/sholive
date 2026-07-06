import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/notify-admin";
import { eurosToCents } from "@/lib/money";
import {
  createPayoutsForChallenge,
  finalizeChallengeCore,
} from "@/app/merchant/challenges/[id]/results/actions";
import {
  AUTO_FINALIZE_GRACE_HOURS,
  hoursAgo,
  isDisputeWindowElapsed,
} from "@/lib/scheduling";

// Route cron (pre-mortem 2026-07-06, cause de mort n°1 : des gagnants jamais payés).
// Rien dans ce projet ne se déclenchait tout seul jusqu'ici (règle d'origine de
// CLAUDE.md) — mais le scoring/les payouts ne dépendaient QUE d'un clic volontaire du
// pro après vote_deadline, sans aucune incitation à revenir une fois son challenge
// terminé. Ce cron reprend le relais dans deux cas précis, sans jamais remplacer la
// vérification humaine que le pro peut toujours faire lui-même avant.
//
// Appelée par Vercel Cron (vercel.json), qui pose automatiquement le header
// Authorization avec CRON_SECRET — protège contre un déclenchement par n'importe qui
// trouvant l'URL. Peut aussi être appelée manuellement avec ce secret.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = {
    finalized: 0,
    refunded: 0,
    transfersSent: 0,
    transfersFailed: 0,
    movedToAwaitingOnboarding: 0,
  };

  // Phase A — auto-finalisation : tout challenge encore actif/voting dont vote_deadline
  // est dépassée depuis plus de AUTO_FINALIZE_GRACE_HOURS (grâce laissée au pro pour
  // cliquer lui-même "Voir les résultats" en premier). Réutilise finalizeChallengeCore
  // (idempotent, verrouillé contre la concurrence) + createPayoutsForChallenge.
  const { data: challengesToFinalize } = await admin
    .from("challenges")
    .select("id")
    .in("status", ["active", "voting"])
    .lte("vote_deadline", hoursAgo(AUTO_FINALIZE_GRACE_HOURS).toISOString());

  for (const challenge of challengesToFinalize ?? []) {
    const result = await finalizeChallengeCore(challenge.id);
    if (result.finalized) {
      summary.finalized++;
      await createPayoutsForChallenge(challenge.id);
    } else if (result.refunded) {
      summary.refunded++;
    }
  }

  // Phase B — sweep des payouts en fenêtre de litige : passe en 'pending' (Transfer
  // tenté) ou 'awaiting_onboarding' (créateur pas encore onboardé) tout payout
  // 'awaiting_review' dont la fenêtre de 72h est passée — sauf si le pro a signalé un
  // problème (challenges.results_disputed_at), auquel cas on ne touche à rien.
  const { data: reviewPayouts } = await admin
    .from("payouts")
    .select(
      "id, challenge_id, creator_id, amount, challenges!inner(results_finalized_at, results_disputed_at, stripe_payment_intent_id), creator_profiles!inner(stripe_account_id, stripe_onboarding_status)",
    )
    .eq("status", "awaiting_review");

  for (const payout of reviewPayouts ?? []) {
    const challenge = payout.challenges;
    const creator = payout.creator_profiles;

    if (!challenge.results_finalized_at) continue; // ne devrait pas arriver
    if (challenge.results_disputed_at) continue; // signalé par le pro, on attend Natan
    if (!isDisputeWindowElapsed(challenge.results_finalized_at)) continue;

    if (creator.stripe_onboarding_status === "complete" && creator.stripe_account_id) {
      try {
        const transfer = await stripe.transfers.create(
          {
            amount: eurosToCents(Number(payout.amount)),
            currency: "eur",
            destination: creator.stripe_account_id,
            // Adosse le Transfer au paiement de CE challenge plutôt qu'à la balance
            // disponible globale (pre-mortem 2026-07-06) ; omis si absent (challenge
            // payé avant l'introduction de cette colonne) — Stripe retombe alors sur
            // le prélèvement classique sur la balance.
            ...(challenge.stripe_payment_intent_id
              ? { source_transaction: challenge.stripe_payment_intent_id }
              : {}),
            metadata: { payout_id: payout.id },
          },
          {
            idempotencyKey: `payout-transfer-${payout.challenge_id}-${payout.creator_id}`,
          },
        );
        await admin
          .from("payouts")
          .update({ status: "pending", stripe_transfer_id: transfer.id })
          .eq("id", payout.id)
          .eq("status", "awaiting_review");
        summary.transfersSent++;
      } catch (error) {
        const { data: markedFailed } = await admin
          .from("payouts")
          .update({ status: "failed" })
          .eq("id", payout.id)
          .eq("status", "awaiting_review")
          .select("id");

        if (markedFailed && markedFailed.length > 0) {
          summary.transfersFailed++;
          await notifyAdmin(
            "Transfer Stripe échoué (sweep cron)",
            `Le Transfer pour le payout ${payout.id} (challenge ${payout.challenge_id}, créateur ${payout.creator_id}) a échoué : ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } else {
      const { data: moved } = await admin
        .from("payouts")
        .update({ status: "awaiting_onboarding" })
        .eq("id", payout.id)
        .eq("status", "awaiting_review")
        .select("id");
      if (moved && moved.length > 0) {
        summary.movedToAwaitingOnboarding++;
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
