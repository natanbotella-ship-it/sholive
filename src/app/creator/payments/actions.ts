"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export type ConnectAccountState = {
  error?: string;
};

export async function createConnectAccountAction(
  _prevState: ConnectAccountState,
  _formData: FormData,
): Promise<ConnectAccountState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "creator") {
    return { error: "Accès réservé aux comptes créateur" };
  }

  const { data: creatorProfile, error: fetchError } = await supabase
    .from("creator_profiles")
    .select("id, stripe_account_id")
    .eq("user_id", user.id)
    .single();

  if (fetchError || !creatorProfile) {
    return { error: "Profil créateur introuvable" };
  }

  let accountId = creatorProfile.stripe_account_id;

  if (!accountId) {
    let account;
    try {
      account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
    } catch {
      return { error: "Impossible de créer le compte de paiement Stripe" };
    }

    accountId = account.id;

    const { error: updateError } = await supabase
      .from("creator_profiles")
      .update({
        stripe_account_id: accountId,
        stripe_onboarding_status: "pending",
      })
      .eq("id", creatorProfile.id);

    if (updateError) {
      return { error: "Impossible d'enregistrer le compte de paiement" };
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let accountLink;
  try {
    accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/creator/payments`,
      return_url: `${siteUrl}/creator/payments`,
      type: "account_onboarding",
    });
  } catch {
    return { error: "Impossible de générer le lien d'activation Stripe" };
  }

  redirect(accountLink.url);
}
