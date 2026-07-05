-- Sholive — schéma initial Supabase
-- À exécuter dans SQL Editor Supabase AVANT de lancer Claude Code sur le Bloc 02 (auth)

-- 1. Profils (étend auth.users, rempli automatiquement à l'inscription)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('creator', 'merchant')),
  age_confirmed_at timestamptz, -- rempli uniquement pour les creators, obligatoire au signup
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
-- Select restreint à l'owner : email est une PII, rien dans les 20 blocs n'a besoin de lire le
-- profil d'un autre utilisateur (les pages publiques passent par merchant_profiles/creator_profiles).
create policy "profiles visibles par leur owner" on profiles for select using (auth.uid() = id);
-- Volontairement AUCUNE policy update/insert/delete : les rows sont écrites uniquement
-- par le trigger handle_new_user (SECURITY DEFINER). Une policy update owner permettrait
-- à un utilisateur de changer son propre `role` via l'API REST (auto-escalade creator ↔
-- merchant) — supprimée à la revue du 2026-07-05.

-- Trigger : crée automatiquement la row profiles à l'inscription (SECURITY DEFINER, bypass RLS).
-- role et age_confirmed proviennent des métadonnées passées à supabase.auth.signUp({ options: { data: { role, age_confirmed } } }).
-- Remplace l'ambiguïté "trigger ou Server Action" du bloc 02 : c'est toujours ce trigger DB, jamais une Server Action.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, age_confirmed_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    case
      when new.raw_user_meta_data->>'role' = 'creator'
       and new.raw_user_meta_data->>'age_confirmed' = 'true'
      then now()
      else null
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Profils marchand (colonnes publiques uniquement — cf. merchant_contacts pour le téléphone)
create table merchant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  business_name text not null,
  city text not null default 'Lyon',
  created_at timestamptz not null default now()
);

alter table merchant_profiles enable row level security;
create policy "merchant profiles visibles par tous" on merchant_profiles for select using (true);
-- with check : seul un compte dont profiles.role = 'merchant' (source de vérité, écrite
-- par le trigger) peut créer/modifier un profil pro. Sans ce contrôle, n'importe quel
-- compte pouvait s'insérer un profil de l'autre rôle (user_metadata étant forgeable).
create policy "merchant profiles modifiables par leur owner" on merchant_profiles for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'merchant')
  );

-- 2b. Contact privé marchand (téléphone) — séparé de merchant_profiles pour ne pas l'exposer publiquement
create table merchant_contacts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchant_profiles(id) on delete cascade unique,
  phone text,
  created_at timestamptz not null default now()
);

alter table merchant_contacts enable row level security;
create policy "contact marchand géré par leur owner" on merchant_contacts for all
  using (merchant_id in (select id from merchant_profiles where user_id = auth.uid()));

-- 3. Profils créateur
-- stripe_account_id / stripe_onboarding_status restent publics : pas de PII exploitable, simplifie le MVP.
create table creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'), -- minuscules forcées, 3-20 car., unicité insensible à la casse par construction
  avatar_url text,
  xp integer not null default 0,
  level text not null default 'Débutant' check (level in ('Débutant','Montant','Confirmé','Expert','Élite')),
  wins integer not null default 0,
  stripe_account_id text,
  stripe_onboarding_status text not null default 'not_started'
    check (stripe_onboarding_status in ('not_started','pending','complete','restricted')),
  created_at timestamptz not null default now()
);

alter table creator_profiles enable row level security;
create policy "creator profiles visibles par tous" on creator_profiles for select using (true);
-- with check : même principe que merchant_profiles — profiles.role fait autorité.
create policy "creator profiles modifiables par leur owner" on creator_profiles for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'creator')
  );

-- 4. Challenges
-- Statuts : draft (créé, pas payé) -> awaiting_payment (Checkout Session créée, paiement non confirmé)
-- -> active (paiement confirmé, soumissions ouvertes) -> voting (submission_deadline dépassée, en attente
-- du vote pro jusqu'à vote_deadline) -> results_finalized (scoring calculé, payouts créés) | refunded
-- (< 10 soumissions à la deadline, remboursement intégral manuel déclenché par Natan).
-- La transition active -> voting n'est pas cronée (pas de scheduler dans la stack) : elle est appliquée
-- paresseusement par le premier bloc qui accède au challenge après submission_deadline (bloc 13 ou 14).
-- La transition voting -> results_finalized est déclenchée par le pro lui-même (bouton "Voir les résultats").
create table challenges (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchant_profiles(id) on delete cascade,
  title text not null,
  description text not null,
  brief jsonb, -- structure : { concept: text, consignes: text[], hashtags_obligatoires: text[], exemples_inspiration?: text[] }
  prize_pool numeric(10,2) not null check (prize_pool >= 200),
  prize_distribution jsonb not null default '{"1":50,"2":30,"3":20}', -- % des 80% nets ; bornes validées côté app (Zod) : 40-60 / 20-35 / 10-25, somme = 100
  status text not null default 'draft'
    check (status in ('draft','awaiting_payment','active','voting','results_finalized','refunded')),
  stripe_checkout_session_id text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  submission_deadline timestamptz not null,
  -- J+7 forcé : toujours = submission_deadline + 7 jours, calculée par la Server Action (bloc 06) et
  -- insérée telle quelle, jamais un champ libre du formulaire. Pas de colonne générée en DB : l'opérateur
  -- timestamptz + interval n'est pas IMMUTABLE en Postgres (dépend du TimeZone de session), donc rejeté
  -- par "generated always as" (erreur 42P17).
  vote_deadline timestamptz not null,
  created_at timestamptz not null default now()
);

alter table challenges enable row level security;
-- Les challenges non lancés (draft ET awaiting_payment : prize pool jamais encaissé)
-- ne sont visibles que par leur propriétaire, via la policy "gérés par leur merchant"
-- ci-dessous. Resserrée à la revue du 2026-07-05 : awaiting_payment était public.
create policy "challenges lancés visibles par tous" on challenges for select
  using (status not in ('draft', 'awaiting_payment'));
create policy "challenges gérés par leur merchant" on challenges for all
  using (merchant_id in (select id from merchant_profiles where user_id = auth.uid()));

-- Grants de colonnes (revue 2026-07-05) : la RLS limite QUELLES rows un merchant touche,
-- pas QUELLES colonnes. Sans ces revokes, un merchant pouvait via l'API REST passer son
-- draft en 'active' sans payer (status/payment_status), ou gonfler prize_pool après
-- paiement pour déclencher des payouts supérieurs aux fonds encaissés. Le client
-- authentifié ne peut plus qu'insérer les colonnes métier ; toutes les transitions de
-- statut passent par le service role côté serveur (webhook Stripe, Server Actions).
revoke insert, update, delete on table challenges from anon, authenticated;
grant insert (merchant_id, title, description, brief, prize_pool, prize_distribution,
  submission_deadline, vote_deadline) on challenges to authenticated;

-- 5. Soumissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  creator_id uuid not null references creator_profiles(id) on delete cascade,
  tiktok_url text,
  reels_url text,
  shorts_url text,
  declared_views integer not null default 0,
  declared_saves integer not null default 0,
  declared_likes integer not null default 0,
  declared_shares integer not null default 0,
  metric_score numeric(5,2), -- persisté uniquement au bloc 14 (finalisation) ; calculé à la volée ailleurs (blocs 08/09/12/13) via la même fonction de formule
  merchant_score numeric(5,2) not null default 0, -- écrit par le bloc 13 (vote) ; le bloc 14 ne le remet à 0 que si aucun vote n'existe à vote_deadline
  total_score numeric(5,2),
  rank integer, -- classement final dans le challenge, rempli au bloc 14 ; permet au profil public (bloc 16) d'afficher les victoires sans exposer payouts
  created_at timestamptz not null default now(),
  unique (challenge_id, creator_id)
);

alter table submissions enable row level security;
create policy "submissions visibles par tous" on submissions for select using (true);
create policy "submissions créées par leur créateur" on submissions for insert
  with check (creator_id in (select id from creator_profiles where user_id = auth.uid()));
create policy "submissions modifiables par leur créateur" on submissions for update
  using (creator_id in (select id from creator_profiles where user_id = auth.uid()));
-- Pas de policy pour l'écriture de merchant_score/metric_score/total_score/rank par le pro ou le système :
-- ce sont des écritures cross-user privilégiées (bloc 13 vote, bloc 14 finalisation), faites via le client
-- Supabase service role côté serveur après vérification de rôle, jamais via le client authentifié classique.

-- 6. Votes (vote du merchant sur le top 10 shortlist)
create table votes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  merchant_id uuid not null references merchant_profiles(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (challenge_id, merchant_id)
);

alter table votes enable row level security;
create policy "votes gérés par leur merchant" on votes for all
  using (merchant_id in (select id from merchant_profiles where user_id = auth.uid()));

-- 7. Payouts
-- status : awaiting_onboarding (créateur n'a pas fini l'onboarding Connect) -> pending (Transfer Stripe
-- créé, en attente de confirmation) -> paid (webhook transfer.created reçu) | failed (webhook transfer.failed)
-- | refunded (challenge sous le seuil de 10 soumissions, aucun payout réel, remboursement manuel du pro).
-- Le passage awaiting_onboarding -> pending est redéclenché automatiquement par le webhook account.updated
-- (bloc 11) dès que stripe_onboarding_status du créateur passe à 'complete', même après results_finalized.
create table payouts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  creator_id uuid not null references creator_profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  rank integer not null,
  status text not null default 'awaiting_onboarding'
    check (status in ('awaiting_onboarding','pending','paid','failed','refunded')),
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  -- Un seul payout par créateur et par challenge : verrou DB contre les créations
  -- concurrentes (le contrôle applicatif "existe déjà ?" n'est pas atomique).
  -- Ajoutée à la revue du 2026-07-05 (migrations/2026-07-05-revue-securite.sql).
  unique (challenge_id, creator_id)
);

alter table payouts enable row level security;
create policy "payouts visibles par leur créateur" on payouts for select
  using (creator_id in (select id from creator_profiles where user_id = auth.uid()));
-- Ajoutée au bloc 15 : sans ça, la page resultats du merchant (RLS standard, pas service role
-- pour une simple lecture) ne voyait jamais les payouts de son propre challenge.
create policy "payouts visibles par le merchant du challenge" on payouts for select
  using (
    challenge_id in (
      select id from challenges
      where merchant_id in (select id from merchant_profiles where user_id = auth.uid())
    )
  );
-- Volontairement aucune policy insert/update : la création et la mise à jour des payouts (bloc 15,
-- webhooks bloc 11/transfer) sont des écritures cross-user privilégiées, faites exclusivement via le
-- client Supabase service role côté serveur, jamais par un client authentifié classique.

-- Storage : bucket avatars créateurs (bloc 05). Public en lecture, écriture restreinte à
-- {user_id}/... via le premier segment du chemin. Appliqué le 2026-07-03 via migration MCP
-- "create_avatars_bucket" — reproduit ici pour que schema.sql reste la source de vérité complète.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars publiquement lisibles"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "un creator peut uploader son propre avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "un creator peut modifier son propre avatar"
on storage.objects for update
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "un creator peut supprimer son propre avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Index utiles
create index on submissions (challenge_id);
create index on submissions (challenge_id, rank);
create index on challenges (merchant_id, status);
create index on challenges (status);
create index on payouts (creator_id);
create index on creator_profiles (stripe_onboarding_status);
