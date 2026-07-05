-- Migration issue de la revue de code du 2026-07-05 (branche review/bugfixes-and-design).
-- schema.sql est déjà à jour de ces changements : ce fichier ne contient que le DELTA
-- à exécuter sur la base Supabase existante (SQL Editor ou migration MCP), en une fois.
-- À APPLIQUER AVANT de reprendre les tests E2E du Bloc 19.

-- ---------------------------------------------------------------------------
-- 1. Payouts dupliqués sous concurrence
-- Le contrôle applicatif "des payouts existent-ils déjà ?" n'est pas atomique :
-- deux exécutions simultanées de la création des payouts (double clic "Voir les
-- résultats" dans deux onglets) passaient toutes les deux le contrôle et
-- inséraient chacune leurs rows. La contrainte unique rend le doublon impossible
-- au niveau DB ; le code ignore désormais l'erreur 23505 (l'appel concurrent
-- gagnant s'occupe du Transfer).
alter table payouts
  add constraint payouts_challenge_creator_unique unique (challenge_id, creator_id);

-- ---------------------------------------------------------------------------
-- 2. Challenges non payés visibles publiquement
-- La policy publique masquait seulement les drafts : un challenge awaiting_payment
-- (Checkout créée mais jamais payée) restait lisible par tous via /challenges/[id]
-- et pouvait recevoir des soumissions. Le code vérifie désormais status = 'active'
-- à la soumission ; la policy est resserrée en défense en profondeur.
drop policy "challenges non-draft visibles par tous" on challenges;
create policy "challenges lancés visibles par tous" on challenges for select
  using (status not in ('draft', 'awaiting_payment'));
