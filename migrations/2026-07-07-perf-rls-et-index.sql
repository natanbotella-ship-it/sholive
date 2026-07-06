-- Corrige les advisories de performance Supabase (get_advisors, type performance) qui
-- peuvent être corrigées sans risque de régression de sécurité :
--
-- 1. auth_rls_initplan : auth.uid() dans une policy RLS est ré-évalué pour CHAQUE ligne
-- scannée ; (select auth.uid()) permet à Postgres de le mettre en cache pour toute la
-- requête (InitPlan). Zéro changement de comportement, uniquement un changement de plan
-- d'exécution — confirmé par la doc Supabase citée par le linter lui-même.
--
-- Volontairement PAS touché : les advisories "multiple permissive policies" (challenges,
-- creator_profiles, merchant_profiles, payouts ont chacune une policy FOR ALL "owner" +
-- une policy SELECT "publique" séparée) demanderaient de fusionner des policies FOR ALL
-- qui protègent aussi INSERT/UPDATE (avec des grants de colonnes très précis posés à la
-- revue de sécurité du 2026-07-05) — trop risqué de retoucher cette logique pour un gain
-- de perf qui ne compte qu'à grande échelle, hors de propos pour un lancement Lyon.
-- Idem pour "unused index" (submissions_challenge_id_idx, creator_profiles_stripe_
-- onboarding_status_idx) : le projet n'a quasiment aucun trafic réel pour l'instant, ces
-- index sont utilisés par des requêtes bien réelles du code (dashboard créateur, cron) —
-- "jamais utilisé" reflète l'absence de trafic, pas une redondance à supprimer.

alter policy "profiles visibles par leur owner" on profiles
  using ((select auth.uid()) = id);

alter policy "merchant profiles modifiables par leur owner" on merchant_profiles
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from profiles where id = (select auth.uid()) and role = 'merchant')
  );

alter policy "contact marchand géré par leur owner" on merchant_contacts
  using (merchant_id in (select id from merchant_profiles where user_id = (select auth.uid())));

alter policy "creator profiles modifiables par leur owner" on creator_profiles
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from profiles where id = (select auth.uid()) and role = 'creator')
  );

alter policy "challenges gérés par leur merchant" on challenges
  using (merchant_id in (select id from merchant_profiles where user_id = (select auth.uid())));

alter policy "submissions créées par leur créateur" on submissions
  with check (creator_id in (select id from creator_profiles where user_id = (select auth.uid())));

alter policy "votes gérés par leur merchant" on votes
  using (merchant_id in (select id from merchant_profiles where user_id = (select auth.uid())));

alter policy "payouts visibles par leur créateur" on payouts
  using (creator_id in (select id from creator_profiles where user_id = (select auth.uid())));

alter policy "payouts visibles par le merchant du challenge" on payouts
  using (
    challenge_id in (
      select id from challenges
      where merchant_id in (select id from merchant_profiles where user_id = (select auth.uid()))
    )
  );

-- 2. unindexed_foreign_keys : 3 FK sans index, utilisées par de vraies requêtes du code
-- (dashboard créateur filtre submissions par creator_id ; le vote/scoring groupe les
-- votes par soumission/marchand).
create index if not exists submissions_creator_id_idx on submissions (creator_id);
create index if not exists votes_merchant_id_idx on votes (merchant_id);
create index if not exists votes_submission_id_idx on votes (submission_id);
