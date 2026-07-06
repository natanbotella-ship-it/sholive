# CLAUDE.md — Sholive

Ce fichier est lu automatiquement par Claude Code à chaque session. Il fait autorité sur les décisions produit et techniques. Ne jamais dévier de ces règles sans confirmation explicite de Natan.

**Méthode de build obligatoire** : ce projet se construit bloc par bloc, voir `BUILD_BLOCKS.md`. Ne jamais essayer de construire plusieurs blocs en une seule réponse, même si ça semble plus rapide. Un bloc = une tâche complète, testée, commitée, avant de passer au suivant. Mets à jour `PROGRESS.md` après chaque bloc terminé.

## Projet

Marketplace de compétition vidéo locale, nom : **Sholive**. Lancement exclusif Lyon. Les pros (merchants) postent un challenge avec prize pool, les créateurs filment leur commerce et postent sur TikTok/Reels, les meilleures vidéos sont récompensées. Commission plateforme 20%, prélevée automatiquement via Stripe.

## Stack (non négociable — ne pas suggérer d'alternative)

- Next.js 14, App Router uniquement
- Backend : Next.js API Routes + Server Actions
- Supabase (PostgreSQL + Auth email/password + Storage avatars)
- Stripe (Checkout pour la collecte, Connect Express pour les payouts créateurs)
- Vercel (hébergement)
- Tailwind CSS — identité « terracotta & sapin » (depuis le 2026-07-05, remplace le violet #7C3AED) : primaire terracotta `#A63A1C`, accent vert sapin `#205C43`, fond crème `#FAF5EC`, police Inter. Les tokens (modes clair + sombre, contrastes AA vérifiés) vivent dans `src/app/globals.css` + `tailwind.config.ts` ; utiliser les classes composant de `globals.css` (`btn-primary`, `btn-outline`, `card`, `input`, `badge`, `link`, `alert-error`) plutôt que des chaînes utilitaires ad hoc
- Interface 100% français, aucun texte en anglais visible utilisateur

## Paiements — Stripe Connect complet

**Flow argent** :
1. Le pro crée un challenge et paie le prize pool via **Stripe Checkout** (ex: 500€)
2. Sholive garde 20% de commission (100€), les 400€ restants sont réservés pour les gagnants
3. Après scoring final et validation du vote (J+7), les `payouts` sont créés au statut `awaiting_review` selon la répartition (défaut 50/30/20 des 400€ nets, donc 200/120/80) — **aucun Transfer Stripe n'est tenté à ce stade** (cf. point 6). Le déclencheur du scoring est **le pro lui-même**, via un bouton "Voir les résultats" sur son dashboard challenge, visible seulement après `vote_deadline` — mais depuis le 2026-07-06 (pre-mortem technique), un **cron Vercel** (`vercel.json`, `src/app/api/cron/sholive-scheduler`) finalise aussi automatiquement tout challenge dont `vote_deadline` dépasse 48h, pour qu'un pro qui oublie ne laisse pas des gagnants jamais payés. Ce n'est plus "rien ne se déclenche tout seul" : c'est la seule tâche planifiée de la stack, volontairement limitée à ce rôle de filet de sécurité
4. Un créateur doit avoir complété l'**onboarding Stripe Connect Express** (identité + IBAN, formulaire hébergé Stripe) avant de pouvoir recevoir un transfert. Tant que ce n'est pas fait, le payout reste au statut `awaiting_onboarding`. Si l'onboarding est complété **après** que le challenge soit `results_finalized`, le webhook `account.updated` doit revérifier automatiquement si ce créateur a des payouts `awaiting_onboarding` et déclencher le Transfer immédiatement — sinon le gagnant n'est jamais payé
5. Les Transfers ne se déclenchent JAMAIS avant que le challenge soit dans un état `results_finalized` — pas de paiement anticipé, même partiel
6. **Fenêtre de litige de 72h** (pre-mortem 2026-07-06) : le scoring reposant entièrement sur des stats auto-déclarées (aucune vérification externe possible au MVP), un payout créé à la finalisation (`awaiting_review`) n'est éligible à un Transfer réel que 72h après `challenges.results_finalized_at` — le cron (`sholive-scheduler`) fait le sweep. Le pro peut "Signaler un problème sur ce classement" sur la page résultats (liens vidéo du top 3 affichés pour vérification) : `challenges.results_disputed_at` bloque alors indéfiniment le sweep pour ce challenge, résolu manuellement par Natan (pas d'UI de levée au MVP, même logique que le remboursement < 10 soumissions)
7. **Transfers adossés au paiement** (pre-mortem 2026-07-06) : `stripe.transfers.create` utilise `source_transaction` = `challenges.stripe_payment_intent_id` (capté au webhook `checkout.session.completed`) plutôt que de prélever sur la balance disponible globale de la plateforme — évite qu'un Transfer échoue faute de fonds disponibles quand plusieurs challenges se chevauchent sur un compte Stripe jeune

**Ne jamais coder toi-même la logique de vérification d'identité** — c'est géré entièrement par le formulaire hébergé Stripe (Connect Onboarding). Le rôle de l'app est uniquement de créer le compte Connect, générer le lien d'onboarding, et écouter le webhook de statut (`account.updated`).

**Webhooks à gérer** : `checkout.session.completed` (confirme le paiement du prize pool, passe le challenge en `active`, capte `stripe_payment_intent_id`), `checkout.session.expired` (repasse un challenge non payé de `awaiting_payment` à `draft`, pre-mortem 2026-07-06), `account.updated` (statut onboarding créateur + reprise des payouts `awaiting_onboarding` en attente), `transfer.created` (payout `pending` → `paid`) / `transfer.failed` (payout `pending` → `failed`, **notifié à Natan via `src/lib/notify-admin.ts`**, pre-mortem 2026-07-06).

**Notifications admin** (`src/lib/notify-admin.ts`, pre-mortem 2026-07-06) : Natan est alerté par email (API Resend en HTTP direct, pas de SDK — variables `RESEND_API_KEY`/`ADMIN_NOTIFICATION_EMAIL` dans `.env.local.example`, no-op silencieux si absentes) sur un Transfer échoué, un challenge passé `refunded`, ou un signalement de fraude sur un classement.

**Répartition du prize pool** : le pro choisit dans une fourchette par rang (1er 40-60%, 2e 20-35%, 3e 10-25%, la somme doit faire exactement 100%), défaut 50/30/20. Calcul des montants en centimes, arrondi à l'inférieur pour chaque part, le reliquat de centimes va au 1er pour que la somme des 3 payouts égale exactement le net.

**Égalité de score** (ex æquo sur `total_score`) : départage par le score métriques le plus haut, puis par la soumission la plus ancienne.

## Garde-fou légal — âge

Pas de vérification d'identité à l'inscription. Juste une checkbox obligatoire au signup créateur : "Je certifie avoir 18 ans ou plus" (non cochée = inscription bloquée). Stocker `age_confirmed_at` en DB comme preuve. Aucune autre logique de vérification d'âge à construire — Stripe agit comme filet de sécurité au moment du payout si besoin.

## Hors scope MVP — NE PAS CODER

- Rapport J+30 automatique → email manuel envoyé par Natan
- Challenge fermé (UGC clients only)
- Intégration API TikTok/Meta pour stats réelles → stats déclarées manuellement par le créateur avec lien vidéo public obligatoire
- Application mobile
- Abonnement pro / tiers payants
- Multi-ville
- OAuth (Google, TikTok login) — email/password uniquement
- Messagerie interne
- Notifications push
- Gestion des créateurs mineurs (tuteur légal) — 18 ans+ uniquement au MVP

Si une tâche te fait dériver vers un de ces points, stop et demande confirmation.

## Schéma base de données (Supabase)

Voir `schema.sql` à la racine — source de vérité (+ `migrations/*.sql` pour le delta à appliquer manuellement, MCP Supabase non authentifié pendant les sessions de revue). 8 tables : `profiles` (extension de `auth.users`, role creator/merchant, age_confirmed_at, visible par son owner uniquement — email = PII), `merchant_profiles` (colonnes publiques uniquement), `merchant_contacts` (téléphone, privé, séparé pour ne pas l'exposer publiquement), `creator_profiles` (+ stripe_account_id, stripe_onboarding_status), `challenges` (+ stripe_checkout_session_id, `stripe_payment_intent_id`, payment_status, `vote_deadline` toujours calculée côté serveur = `submission_deadline` + 7 jours jamais un input du formulaire, `results_finalized_at`/`results_disputed_at` depuis le 2026-07-06 — cf. section Paiements), `submissions` (+ `rank` final), `votes`, `payouts` (+ stripe_transfer_id, statuts `awaiting_review` → `awaiting_onboarding` → `pending` → `paid`/`failed`, le premier ajouté au 2026-07-06 pour la fenêtre de litige). RLS activé sur toutes les tables dès la création — ne jamais désactiver RLS pour "simplifier", corriger la policy à la place. La RLS limite les ROWS, pas les COLONNES : les tables à écritures privilégiées (`challenges`, `creator_profiles`, `submissions`) ont aussi des `revoke`/`grant` de colonnes explicites (cf. `migrations/2026-07-05-revue-securite.sql`) — toute nouvelle colonne privilégiée doit être exclue du `grant insert/update` du client authentifié, jamais seulement protégée par une policy.

**Écritures cross-user privilégiées** (création de `payouts`, écriture de `merchant_score`/`metric_score`/`total_score`/`rank` sur les soumissions d'un autre utilisateur lors du vote ou de la finalisation, création de `profiles` à l'inscription) : jamais via le client authentifié standard (RLS ne les autorise pas, volontairement). Toujours via le client Supabase **service role** côté serveur, après vérification explicite du rôle appelant — sauf la création de `profiles` qui passe par un trigger DB `SECURITY DEFINER` (`handle_new_user`), pas par une Server Action.

## Logique métier (implémenter exactement ainsi)

**Scoring soumission**
- Score métriques (/50) = (vues × 0.4) + (saves × 0.4) + (likes × 0.1) + (partages × 0.1) ; normalisé sur 50 pts par un rapport **logarithmique** au max du challenge (`log1p(brut) / log1p(max) × 50`), **pas linéaire** — déviation délibérée actée le 2026-07-06 (pre-mortem technique), implémentée dans `src/lib/scoring.ts` : avec un rapport linéaire, une seule soumission aux stats gonflées écrasait le score de toutes les autres à ~0, donnant à un unique fraudeur le contrôle total du classement et de la shortlist soumise au vote du pro. `log1p` est strictement croissant donc l'ordre du classement est inchangé, seul l'écart avec un outlier isolé est amorti. À combiner avec l'écran de vérification des liens vidéo du top 3 avant paiement (cf. section Paiements)
- Score marchand (/50) = 50 pts au gagnant du vote pro sur le top 10 shortlist, 0 aux autres
- Score total = score métriques + score marchand

**Niveaux créateur (XP)**
- Débutant 0-99 · Montant 100-299 · Confirmé 300-699 · Expert 700-1499 · Élite 1500+
- +10 XP soumission, +50 XP top 3, +100 XP victoire — **cumulables** : le gagnant est aussi dans le top 3, donc il reçoit +150 XP au total (+50 puis +100), plus le +10 participation = 160 au total sur le cycle de vie du challenge
- **+10 XP soumission crédité à la finalisation du challenge, pas à l'insert de la soumission** (déviation actée le 2026-07-06, pre-mortem technique) : sinon n'importe quel compte pouvait farmer de l'XP en soumettant des liens sur un maximum de challenges sans jamais viser un vrai résultat, y compris sur des challenges finissant `refunded` (< 10 soumissions, où aucune XP ne doit être gagnée). Tous les participants d'un challenge finalisé reçoivent leur +10 en même temps que le scoring, dans `finalizeChallengeResultsAction`
- `level` doit être recalculé à partir de `xp` à chaque fois que l'XP change (finalisation du challenge) — jamais figé après le calcul initial

**Badges** : Premier challenge, Première victoire, 3 victoires, 10 soumissions

**Règles challenge**
- Prize pool minimum 200€, payé intégralement via Stripe Checkout avant que le challenge passe en statut `active`
- Répartition prize pool : choix du pro dans une fourchette par rang (1er 40-60%, 2e 20-35%, 3e 10-25%, somme = 100%), défaut 50/30/20 des 80% nets (après commission)
- Deadline validation vote pro forcée à J+7 : `vote_deadline` = `submission_deadline` + 7 jours, calculée et insérée par la Server Action à la création du challenge (pas une colonne générée en DB — `timestamptz + interval` n'est pas IMMUTABLE en Postgres), jamais un champ éditable dans le formulaire. Sinon l'algo décide seul (score métriques uniquement)
- **Moins de 10 soumissions** au challenge à `submission_deadline` → le challenge ne se valide pas, statut `refunded`, remboursement **intégral** (commission Sholive incluse) déclenché manuellement par Natan. Ce seuil de 10 remplace toute logique de "remboursement partiel" — il n'y en a pas au MVP
- Multi-plateforme : TikTok + Reels obligatoires, Shorts optionnel. Domaines acceptés à la validation Zod : TikTok = `tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com` ; Reels = `instagram.com/reel/`, `instagram.com/p/` ; Shorts = `youtube.com/shorts/`, `youtu.be`
- `brief` (jsonb) structuré ainsi : `{ concept: string, consignes: string[], hashtags_obligatoires: string[], exemples_inspiration?: string[] }`
- `username` créateur : minuscules forcées, 3-20 caractères, alphanumérique + underscore uniquement (contrainte DB), unicité insensible à la casse par construction

## Conventions de code

- TypeScript strict partout, pas de `any`
- Server Components par défaut, `"use client"` seulement si interactivité nécessaire
- Server Actions pour toutes les mutations (webhooks Stripe = seule exception, API route dédiée)
- Validation des inputs avec Zod avant toute écriture DB
- Toute requête DB sensible passe par une vérification de rôle côté serveur, en plus de la RLS (défense en profondeur)
- Clés Stripe et Supabase service role toujours en variable d'environnement, jamais en dur, jamais commit
- Noms de fichiers et variables en anglais, contenu UI en français
- Vitest (`npm test`, ajouté au pre-mortem 2026-07-06) pour la logique pure isolée (`src/lib/*.ts` : scoring, xp, payouts, money) — pas de test end-to-end dans ce framework, `E2E_TEST_GUIDE.md` reste la méthode pour le Bloc 19. Toute nouvelle fonction pure touchant au scoring/XP/argent doit avoir un test
- Conversions euros/centimes toujours via `src/lib/money.ts` (`eurosToCents`/`centsToEuros`), jamais un `× 100`/`÷ 100` inline
- `npm run gen:types` régénère `src/lib/supabase/database.types.ts` depuis le schéma Supabase lié (nécessite `supabase login` + `supabase link`, non exécutable dans une session Claude Code sans navigateur) — après toute migration touchant aux colonnes, régénérer ou éditer ce fichier à la main pour rester synchro

## Méthode de travail avec Claude Code

- Un seul bloc de `BUILD_BLOCKS.md` à la fois. Résume ton plan en 3-5 lignes avant de coder si le bloc touche à l'auth, au scoring, ou à Stripe (argent) — attends validation. Pour le reste (CRUD simple, UI, pages statiques), exécute directement.
- Ne jamais introduire de dépendance npm non listée dans ce fichier sans le signaler explicitement
- Commit atomique après chaque bloc terminé et fonctionnel, puis mets à jour `PROGRESS.md`
