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

-- ---------------------------------------------------------------------------
-- 3. Rôle auto-escaladable (user_metadata forgeable + policy update sur profiles)
-- user_metadata.role est modifiable par l'utilisateur lui-même (auth.updateUser) et la
-- policy update de profiles permettait aussi de changer son propre role en SQL/REST.
-- N'importe quel compte pouvait donc cumuler les deux rôles (ex. un pro qui se crée un
-- profil créateur et soumet/vote sur son propre challenge). Le code lit désormais le
-- rôle dans profiles.role (src/lib/auth.ts) ; côté DB :
--   a) plus aucune policy update sur profiles (rows écrites uniquement par le trigger)
--   b) la création/modification d'un profil merchant/creator exige le rôle correspondant
drop policy "profiles modifiables par leur owner" on profiles;

drop policy "merchant profiles modifiables par leur owner" on merchant_profiles;
create policy "merchant profiles modifiables par leur owner" on merchant_profiles for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'merchant')
  );

drop policy "creator profiles modifiables par leur owner" on creator_profiles;
create policy "creator profiles modifiables par leur owner" on creator_profiles for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'creator')
  );
