import Stripe from "stripe";

// Cle absente tant que Natan n'a pas ajoute STRIPE_SECRET_KEY dans .env.local :
// on ne bloque pas l'import (utilise par le webhook, qui n'a pas besoin d'une
// cle valide pour la seule verification de signature), l'erreur remontera
// naturellement au premier vrai appel API (creation de Checkout Session).
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_missing_key_see_env_local_example",
);
