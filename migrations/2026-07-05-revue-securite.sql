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

-- ---------------------------------------------------------------------------
-- 4. Colonnes privilégiées de challenges écrivables par le merchant via l'API REST
-- La RLS restreint les rows, pas les colonnes : un merchant pouvait passer son draft
-- en 'active' sans payer (status/payment_status), gonfler prize_pool après paiement
-- (payouts calculés dessus -> transfers supérieurs aux fonds encaissés), déplacer les
-- deadlines, ou supprimer un challenge finalisé (cascade sur submissions/payouts —
-- un payout awaiting_onboarding disparaissait avant le virement du gagnant).
-- Le client authentifié ne peut plus qu'insérer les colonnes métier du brouillon ;
-- transitions de statut et écritures Stripe passent par le service role.
revoke insert, update, delete on table challenges from anon, authenticated;
grant insert (merchant_id, title, description, brief, prize_pool, prize_distribution,
  submission_deadline, vote_deadline) on challenges to authenticated;

-- ---------------------------------------------------------------------------
-- 5. xp/level/wins/stripe_* de creator_profiles écrivables par le créateur
-- Même mécanique que le point 4 : via l'API REST, un créateur pouvait s'attribuer
-- XP/niveau/victoires (badges et crédibilité publique falsifiés), se déclarer
-- stripe_onboarding_status='complete' sans onboarding réel, ou rediriger son
-- stripe_account_id vers un compte Connect arbitraire. Le client authentifié ne
-- peut plus écrire que username/avatar_url ; XP, wins et colonnes Stripe passent
-- par le service role (Server Actions/webhooks, code adapté en conséquence).
revoke insert, update, delete on table creator_profiles from anon, authenticated;
grant insert (user_id, username, avatar_url) on creator_profiles to authenticated;
grant update (username, avatar_url) on creator_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Scores, rang et ancienneté des submissions forgeables par le créateur
-- L'insert acceptait metric_score/merchant_score/total_score/rank pré-remplis
-- (rank=1 = fausse victoire affichée sur le profil public /creators/[username])
-- et un created_at antidaté (gagne les départages d'égalité, à l'ancienneté).
-- La policy update owner n'était utilisée par aucune feature et permettait de
-- modifier les stats déclarées après la deadline — voire rank/scores après
-- finalisation. Scores/rangs ne s'écrivent que via service role (blocs 13/14).
drop policy "submissions modifiables par leur créateur" on submissions;
revoke insert, update, delete on table submissions from anon, authenticated;
grant insert (challenge_id, creator_id, tiktok_url, reels_url, shorts_url,
  declared_views, declared_saves, declared_likes, declared_shares)
  on submissions to authenticated;
