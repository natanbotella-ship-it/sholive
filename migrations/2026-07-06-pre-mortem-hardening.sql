-- Migration issue du pre-mortem technique du 2026-07-06 (branche
-- review/bugfixes-and-design). schema.sql est déjà à jour de ces changements :
-- ce fichier ne contient que le DELTA à exécuter sur la base Supabase existante
-- (SQL Editor ou migration MCP), à la suite de migrations/2026-07-05-revue-securite.sql.
-- À APPLIQUER AVANT d'activer le cron (vercel.json) en production.

-- ---------------------------------------------------------------------------
-- 1. source_transaction sur les Transfers (Transfers tirant sur la mauvaise balance Stripe)
-- stripe.transfers.create sans source_transaction prélève sur la balance DISPONIBLE de
-- la plateforme, qui peut être insuffisante ou partiellement retenue en réserve sur un
-- compte Stripe jeune (fonds d'un Checkout indisponibles ~7 jours). Si plusieurs
-- challenges se chevauchent, la finalisation du premier peut échouer faute de fonds
-- disponibles alors même que SON paiement a bien été encaissé. Le Payment Intent du
-- Checkout est capté au webhook checkout.session.completed et utilisé comme
-- source_transaction : le Transfer est alors adossé au paiement de CE challenge,
-- indépendamment de la balance globale (pattern Stripe standard pour les marketplaces).
alter table challenges add column if not exists stripe_payment_intent_id text;

-- ---------------------------------------------------------------------------
-- 2. Fenêtre de litige de 72h avant tout Transfer réel
-- Le scoring reposant entièrement sur des stats auto-déclarées (aucune vérification
-- externe possible au MVP), un fraudeur découvert après la finalisation n'avait aucune
-- fenêtre de rattrapage : le Transfer partait immédiatement. results_finalized_at marque
-- le début d'une fenêtre de 72h ; results_disputed_at (rempli par le pro via "Signaler un
-- problème") bloque indéfiniment le Transfer tant que Natan ne l'a pas résolu.
alter table challenges add column if not exists results_finalized_at timestamptz;
alter table challenges add column if not exists results_disputed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Nouveau statut payout 'awaiting_review' (fenêtre de litige)
-- Les payouts sont désormais créés en 'awaiting_review' à la finalisation (jamais de
-- Transfer immédiat) ; le cron de sweep (src/app/api/cron/*) les fait passer en
-- 'awaiting_onboarding' ou 'pending' une fois les 72h passées, SAUF si
-- results_disputed_at est rempli.
alter table payouts drop constraint if exists payouts_status_check;
alter table payouts add constraint payouts_status_check
  check (status in ('awaiting_review','awaiting_onboarding','pending','paid','failed','refunded'));
alter table payouts alter column status set default 'awaiting_review';

-- ---------------------------------------------------------------------------
-- 4. Auto-finalisation (cause de mort n°1 du pre-mortem : gagnants jamais payés)
-- Le seul déclencheur du scoring/payouts était un clic volontaire du pro après
-- vote_deadline — sans incitation à revenir une fois son challenge terminé, un pro qui
-- oublie ou se désintéresse laisse des gagnants jamais payés pour un prize pool déjà
-- encaissé. Le cron de finalisation (src/app/api/cron/*, Vercel Cron, vercel.json)
-- finalise automatiquement tout challenge dont vote_deadline est dépassée depuis plus de
-- 48h (grâce laissée au pro pour agir lui-même) : aucun changement de schéma nécessaire,
-- réutilise finalizeChallengeResultsAction/createPayoutsForChallenge existantes.
