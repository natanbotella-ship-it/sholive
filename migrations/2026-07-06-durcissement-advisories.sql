-- Corrige 2 des 3 alertes de sécurité relevées par l'audit Supabase (get_advisors)
-- lancé après le pre-mortem du 2026-07-06. La 3e (protection mot de passe compromis /
-- HaveIBeenPwned) est un réglage du dashboard Supabase Auth, pas du SQL.

-- 1. Bucket avatars public : la policy SELECT actuelle autorise le listing complet des
-- fichiers du bucket via l'API storage authentifiée (.list()/.download()). Un bucket
-- marqué "public" (storage.buckets.public = true) sert déjà les objets via URL directe
-- (getPublicUrl) sans jamais passer par la RLS de storage.objects — cette policy ne
-- protégeait donc rien pour l'affichage des avatars, elle exposait juste le listing.
-- Vérifié : le code (creator/onboarding, creator/profile) n'utilise que .upload() et
-- .getPublicUrl(), jamais .list()/.download() sur ce bucket.
drop policy "avatars publiquement lisibles" on storage.objects;

-- 2. handle_new_user() est SECURITY DEFINER et donc exécutable en RPC direct par anon/
-- authenticated via /rest/v1/rpc/handle_new_user. Un trigger n'a besoin d'aucun grant
-- EXECUTE pour se déclencher (il tourne avec les droits du owner de la table, invoqué
-- par le moteur de trigger, jamais par un appel RPC direct côté app).
revoke execute on function public.handle_new_user() from anon, authenticated;
