# PROGRESS.md — Sholive

Claude Code : mets à jour ce fichier après chaque bloc terminé (coche + une ligne de note si pertinent). Au début de chaque nouvelle session, lis ce fichier avant de commencer.

- [x] Bloc 00 — Setup projet
- [x] Bloc 01 — Base de données
- [x] Bloc 02 — Inscription (auth)
- [x] Bloc 03 — Connexion + protection de routes
- [x] Bloc 04 — Onboarding profil marchand
- [x] Bloc 05 — Onboarding profil créateur
- [x] Bloc 06 — Création de challenge (sans paiement)
- [~] Bloc 07 — Stripe Checkout : paiement du prize pool (code complet, Checkout Session non testée en vrai — clé Stripe manquante)
- [x] Bloc 08 — Liste publique des challenges
- [x] Bloc 09 — Page détail challenge
- [x] Bloc 10 — Soumission créateur
- [~] Bloc 11 — Stripe Connect : onboarding créateur (code complet, création de compte Connect réelle non testée — clé Stripe manquante)
- [x] Bloc 12 — Dashboard pro : suivi challenge
- [x] Bloc 13 — Vote pro sur shortlist
- [x] Bloc 14 — Scoring et calcul final
- [x] Bloc 15 — Résultats et déclenchement des payouts
- [x] Bloc 16 — Profil créateur public
- [x] Bloc 17 — Dashboard créateur
- [x] Bloc 18 — Landing page
- [ ] Bloc 19 — Tests end-to-end

## Notes libres (bugs connus, décisions prises en cours de route)

- 2026-07-03 : audit pré-build (agent Opus) sur CLAUDE.md/BUILD_BLOCKS.md/schema.sql, incohérences corrigées avant le Bloc 00. Décisions prises avec Natan :
  - Déclencheur du scoring/payouts (bloc 14→15) : bouton merchant "Voir les résultats" après vote_deadline, pas de cron
  - Payout `awaiting_onboarding` après `results_finalized` : repris automatiquement par le webhook `account.updated` (bloc 11)
  - XP vainqueur : +150 cumulé (+50 top 3 et +100 victoire)
  - Seuil de validité du challenge : remplacé "< 5 soumissions → remboursement partiel" par "< 10 soumissions → remboursement intégral" (inscription = soumission, pas de flow séparé)
  - `vote_deadline` : calculée par la Server Action (submission_deadline + 7j), plus un champ de formulaire — tentative initiale en colonne générée DB abandonnée (`timestamptz + interval` non IMMUTABLE en Postgres, erreur 42P17 à l'exécution du schéma)
  - Ajout table `merchant_contacts` (téléphone) + policies `profiles`/`merchant_profiles` resserrées : email et téléphone n'étaient pas censés être publics avec les policies RLS d'origine
  - Détail complet des autres corrections (statuts orphelins, RLS payouts, forward reference metric_score bloc13/14, etc.) dans l'historique de conversation Claude Code du 2026-07-03

- 2026-07-03 : Bloc 00 (setup) + Bloc 01 (DB) terminés.
  - Next.js 14.2.35 (pas `@latest` — aurait installé Next 16 + Tailwind v4, hors stack imposée), TypeScript, Tailwind 3.4.1, App Router, `src/`
  - Police Inter (next/font/google) à la place de Geist par défaut ; couleur `primary` `#7C3AED` ajoutée à `tailwind.config.ts`
  - Clients Supabase créés : `src/lib/supabase/client.ts` (browser), `server.ts` (SSR, cookies via next/headers), `admin.ts` (service role, usage serveur uniquement)
  - `@supabase/ssr` et `@supabase/supabase-js` ajoutés aux dépendances (non listées telles quelles dans CLAUDE.md mais requises par le stack Supabase imposé — signalé ici comme demandé)
  - `.env.local.example` créé (committé) ; `.env.local` réel rempli et testé (requête REST authentifiée en service role → 200)
  - Projet Supabase "Sholive" créé (région Paris), `schema.sql` exécuté, 8 tables confirmées avec RLS actif via le MCP Supabase (`list_tables`)
  - `npm run dev` vérifié (HTTP 200, page de test "Sholive / Setup Bloc 00 — OK" rendue avec Tailwind + Inter)

- 2026-07-03 : Bloc 02 (inscription) terminé.
  - Page `/register` (formulaire client + Server Action `registerAction`, validation Zod, checkbox 18+ conditionnelle si role=creator)
  - Testé de bout en bout via l'API admin Supabase (contourne le rate limit email du plan gratuit) : trigger `handle_new_user` confirmé, `role`/`age_confirmed_at` corrects pour creator et merchant, comptes de test supprimés ensuite
  - Rate limit d'envoi d'email très bas sur le plan gratuit Supabase (quelques emails/heure) — à garder en tête pour les tests manuels réels, pas bloquant pour le MVP mais à surveiller si beaucoup d'inscriptions test

- 2026-07-03 : Bloc 03 (connexion + protection de routes) terminé.
  - Pages `/login`, `/forgot-password`, `/reset-password` + `src/middleware.ts` (protège `/creator/*` et `/merchant/*` selon le rôle en session)
  - Ajout non prévu dans le bloc mais nécessaire : route `src/app/auth/confirm/route.ts` (Route Handler) pour échanger le code du lien "mot de passe oublié" contre une session — un Server Component ne peut pas écrire de cookies, donc l'échange devait passer par un Route Handler, pas directement sur la page `/reset-password`
  - Nouvelle variable d'env `NEXT_PUBLIC_SITE_URL` (redirections email)
  - Dashboards placeholder `/creator/dashboard` et `/merchant/dashboard` (vraies pages aux blocs 12/17)
  - Testé sans navigateur headless (Playwright non installé, pas ajouté pour un seul test) : script Node utilisant directement `@supabase/ssr` pour générer un vrai cookie de session, envoyé en HTTP brut vers les routes protégées. 5 scénarios validés : mauvais mot de passe rejeté, creator/merchant accèdent à leur dashboard, redirection correcte si mauvaise section, non connecté → `/login`

- 2026-07-03 : Bloc 04 (onboarding profil marchand) terminé.
  - Page `/merchant/onboarding` (business_name, city par défaut Lyon, phone) — Server Action écrit dans `merchant_profiles` puis `merchant_contacts`, sous RLS standard (pas de service role nécessaire, la policy owner suffit)
  - Page redirige vers `/merchant/dashboard` si le profil existe déjà (évite l'erreur de doublon en resoumettant le formulaire)
  - Testé avec un compte marchand réel sous RLS (pas service role) : insert profil + contact OK, doublon correctement rejeté (contrainte unique), lecture anonyme de `merchant_contacts` vide (téléphone bien privé)

- 2026-07-03 : Bloc 05 (onboarding profil créateur) terminé.
  - Bucket Storage `avatars` créé via migration MCP (public en lecture, 5 Mo max, png/jpeg/webp/gif uniquement), policies RLS sur `storage.objects` : écriture restreinte à `{user_id}/...`, dupliqué dans `schema.sql` pour traçabilité
  - Page `/creator/onboarding` (username + avatar optionnel) — Server Action upload vers Storage puis crée `creator_profiles`, sous RLS standard
  - Testé avec un vrai compte créateur (pas service role) : upload avatar OK, lecture publique de l'avatar OK (HTTP 200), upload dans le dossier d'un autre user rejeté par RLS, username non-minuscule rejeté par la contrainte DB

- 2026-07-03 : Bloc 06 (création de challenge sans paiement) terminé.
  - Page `/merchant/challenges/new` (titre, description, brief structuré en textarea une ligne = un item, prize_pool, répartition 3 champs avec bornes, submission_deadline) — redirige vers l'onboarding si le profil pro n'existe pas encore
  - `vote_deadline` calculée par la Server Action (submission_deadline + 7 jours), pas un champ du formulaire
  - Testé avec un vrai compte marchand sous RLS : insert OK (status `draft`/`unpaid` par défaut), `vote_deadline` vérifiée exactement +7 jours, contrainte DB `prize_pool >= 200` confirmée comme filet de sécurité même si Zod était contourné, brouillon bien invisible en lecture anonyme

- 2026-07-03 : Bloc 07 (Stripe Checkout) codé mais **partiellement testé** — décision explicite avec Natan de coder sans les clés Stripe réelles, à compléter plus tard.
  - Bouton "Payer et lancer le challenge" ajouté à l'écran de succès du Bloc 06 (pas de nouvelle page dashboard). Server Action `createCheckoutSessionAction` crée la Checkout Session (prize_pool complet, pas de split de commission à ce stade), stocke `stripe_checkout_session_id`, passe `status` à `awaiting_payment`
  - Route `/api/webhooks/stripe` (Route Handler, exception aux Server Actions) : vérifie la signature, `checkout.session.completed` → `payment_status` = `paid`, `status` = `active`, via service role
  - **Testé** : le webhook en entier, avec un événement signé localement (`STRIPE_WEBHOOK_SECRET` généré temporairement, aucun appel réseau à Stripe nécessaire pour la vérification de signature) — signature valide → statut mis à jour correctement ; signature invalide → rejeté (400)
  - **Non testé** : la création réelle de la Checkout Session (`stripe.checkout.sessions.create`), qui nécessite un vrai `STRIPE_SECRET_KEY` — actuellement vide dans `.env.local`. À vérifier dès que Natan fournit une clé de test
  - `STRIPE_WEBHOOK_SECRET` actuel est une valeur temporaire générée localement pour les tests — À REMPLACER par le vrai "Signing secret" une fois l'endpoint configuré dans le dashboard Stripe (sinon les vrais webhooks Stripe seront rejetés)

- 2026-07-03 : Bloc 08 (liste publique des challenges) terminé.
  - Avant d'écrire la requête à jointure, génération des types TypeScript Supabase (`src/lib/supabase/database.types.ts`, via MCP) et branchement sur les 3 clients (browser/server/admin) — jusqu'ici les requêtes Supabase n'étaient pas vraiment typées, ce qui violait la règle "TypeScript strict, pas de `any`" de `CLAUDE.md`. Aucune erreur de type révélée sur le code existant
  - Page `/challenges` : filtre `status = active` ET `submission_deadline > now()`, jointure `merchant_profiles!inner` pour `business_name`/`city`, filtre ville par query param (générique, une seule option "Lyon" pour l'instant)
  - Testé contre le serveur dev réel : challenge actif+futur affiché, challenge actif mais deadline passée masqué, brouillon masqué, filtre ville Paris/Lyon fonctionne correctement

- 2026-07-03 : Bloc 09 (page détail challenge) terminé.
  - Page `/challenges/[id]` : brief complet, prize pool, répartition, deadlines, nombre de soumissions, bouton "Participer" (vers `/creator/submit/[id]`, Bloc 10) visible seulement si connecté creator ET deadline non dépassée
  - Testé contre le serveur dev réel : contenu complet affiché, compteur de soumissions à jour après ajout, bouton correctement absent (anonyme / merchant / deadline passée) et présent (creator + deadline future), 404 sur un id inexistant
  - Note test : deux faux négatifs initiaux dus aux marqueurs `<!-- -->` que React insère en SSR entre nœuds JSX adjacents — vérifiés manuellement sur le HTML brut, aucun vrai bug

- 2026-07-03 : Bloc 10 (soumission créateur) terminé.
  - Page `/creator/submit/[id]` : TikTok + Reels obligatoires, Shorts optionnel, stats déclarées. Bloque si deadline dépassée ou soumission déjà existante, redirige vers l'onboarding si profil créateur manquant
  - Validation des domaines par URL réelle (`new URL().hostname`/`.pathname`, pas de regex fragile) — `src/lib/xp.ts` créé pour `levelForXp`, réutilisé par avance pour le Bloc 14 (mêmes paliers)
  - Testé : 14 cas de validation de domaine (TikTok/Reels/Shorts, y compris tentatives de contournement type `eviltiktok.com.fake`) tous corrects ; insert sous RLS OK ; franchissement de palier XP vérifié (95→105 = Débutant→Montant) ; doublon de soumission rejeté ; lecture publique OK ; page affiche bien "déjà soumis" après coup

- 2026-07-04 : Bloc 11 (Stripe Connect onboarding créateur) codé, **partiellement testé** — même limitation que le Bloc 07, `STRIPE_SECRET_KEY` toujours vide.
  - Page `/creator/payments` (statut onboarding + bouton "Activer mes paiements") ; Server Action `createConnectAccountAction` crée le compte Connect Express (réutilise `stripe_account_id` existant), génère un Account Link, redirige vers le formulaire hébergé Stripe
  - Webhook `/api/webhooks/stripe` : ajout du cas `account.updated` — dérive le nouveau statut (`complete` si `details_submitted && charges_enabled`, `restricted` si `requirements.disabled_reason`, sinon `pending`), met à jour `creator_profiles` via service role. Si le nouveau statut est `complete`, cherche les `payouts` `awaiting_onboarding` de ce créateur et déclenche leur Transfer Stripe
  - Pas de try/catch autour de `stripe.transfers.create` : une levée d'exception fait échouer le webhook (500), ce qui déclenche le retry automatique de Stripe — la requête `awaiting_onboarding` étant relue à chaque appel, un retry ne retente que les payouts encore non résolus (idempotent par construction), sans logique de retry custom à maintenir
  - **Testé** (dev server + script Node éphémère, cookie de session réel généré via `@supabase/ssr`, événements `account.updated` signés localement via `stripe.webhooks.generateTestHeaderString`, aucun appel réseau Stripe) : page conforme aux 4 statuts + bouton absent seulement si `complete` ; redirection vers l'onboarding si profil manquant ; signature invalide rejetée (400) ; transitions `pending`/`restricted`/`complete` appliquées correctement ; scénario payout en attente + passage à `complete` — le webhook échoue bien (500, `transfers.create` sans clé réelle) mais **sans corruption d'état** : `creator_profiles.stripe_onboarding_status` mis à jour à `complete` malgré l'échec en aval, payout resté proprement `awaiting_onboarding` (jamais marqué `pending` à tort)
  - **Non testé** : la création réelle de compte Connect Express et l'exécution réelle d'un Transfer, qui nécessitent un vrai `STRIPE_SECRET_KEY` — à vérifier dès que Natan fournit une clé de test

- 2026-07-04 : Bloc 12 (dashboard pro : suivi challenge) terminé.
  - `/merchant/dashboard` : liste tous les challenges du merchant (tous statuts, y compris `draft`/`awaiting_payment` — la policy RLS owner les autorise même si la policy publique les masque) avec statut traduit (`src/lib/challenge-status.ts`, réutilisable au Bloc 15), prize pool, deadline
  - `/merchant/challenges/[id]` : détail avec liste des soumissions (username, stats déclarées, liens TikTok/Reels/Shorts), vérification d'ownership explicite (`challenge.merchant_id === merchantProfile.id`, sinon `notFound()`) — nécessaire car la policy RLS publique rend aussi visibles les challenges non-`draft` d'un autre merchant
  - Testé avec 2 comptes marchands réels sous RLS : dashboard A liste bien ses 2 challenges (draft + actif) avec statuts corrects, dashboard B (aucun challenge) n'affiche rien de A, détail accessible au propriétaire avec stats/liens corrects, détail d'un challenge d'autrui → 404, id inexistant → 404
  - Faux négatif de test attendu (même cause qu'au Bloc 09, marqueurs `<!-- -->` React SSR entre nœuds adjacents) sur l'assertion brute "1000 vues" — vérifié manuellement sur le HTML brut, rendu correct

- 2026-07-04 : Bloc 13 (vote pro sur shortlist) terminé.
  - `src/lib/scoring.ts` : `rankSubmissionsByMetricScore` (score métriques /50 normalisé par rapport au max du challenge, égalités départagées par score puis ancienneté) — pure et réutilisée telle quelle au Bloc 14
  - Page `/merchant/challenges/[id]/vote` : transition paresseuse `active`→`voting` à submission_deadline dépassée (écriture directe sur sa propre row, RLS owner suffit, pas de service role), affiche le top 10 à la volée, bloque avant submission_deadline ("reviens plus tard") et après vote_deadline ("l'algo décidera seul"), affiche l'état déjà-voté si une row `votes` existe
  - Server Action `castVoteAction` (service role) : revérifie ownership/deadlines et surtout que la soumission votée fait bien partie du top 10 recalculé côté serveur (jamais confiance dans l'id posté par le client), crée `votes`, écrit `merchant_score` (50 gagnant / 0 les autres). Contrainte unique `votes(challenge_id, merchant_id)` bloque nativement un second vote
  - Lien "Voter sur les soumissions" ajouté à la page détail du Bloc 12 (visible si statut `active`/`voting`)
  - **Testé** : 8 scénarios via un compte marchand réel + 11 soumissions à métriques distinctes (dashboard dev, cf. limite ci-dessous) — attente avant deadline, top 10/11 correctement tronqué et trié, transition de statut, 404 pour un merchant tiers, vote hors top 10 rejeté, vote valide (merchant_score 50/0 vérifiés en DB), double vote rejeté, page reflète l'état voté, deadline de vote dépassée (page + action)
  - **Limite de méthode de test** : `castVoteAction` utilise `useFormState`, dont l'invocation réelle passe par le protocole interne Next.js (header `Next-Action`, arguments encodés Flight) — injouable par un simple POST form-urlencoded sans navigateur réel (Playwright non installé, décision déjà actée au Bloc 03). La logique métier de l'action a donc été vérifiée en rejouant exactement la même séquence d'appels Supabase (client authentifié merchant + service role) plutôt qu'en frappant réellement la route HTTP de l'action — le rendu des pages (Server Components, GET) a lui été testé en conditions réelles sans réserve

- 2026-07-04 : Bloc 14 (scoring et calcul final) terminé.
  - `finalizeChallengeResultsAction` créée dans `src/app/merchant/challenges/[id]/results/actions.ts` — **pas de page/bouton à ce stade** : le bouton "Voir les résultats" qui déclenche cette action appartient explicitement au Bloc 15 (`BUILD_BLOCKS.md`), donc rien d'autre n'a été ajouté dans ce bloc pour respecter le découpage un-bloc-à-la-fois
  - Ordre des vérifications : ownership, idempotence (`results_finalized`/`refunded` → retour immédiat sans recalcul, protège contre un double clic futur du Bloc 15), `vote_deadline` non atteinte → erreur ; puis seuil des 10 soumissions → `refunded` direct sans aucun scoring ; sinon `metric_score` (réutilise `rankSubmissionsByMetricScore` du Bloc 13) + `merchant_score` (reset à 0 uniquement si aucune row `votes` n'existe, sinon respecté tel quel) → `total_score`, tri avec égalités départagées par score métriques puis ancienneté, `rank` persisté pour toutes les soumissions (pas seulement le top 3 — nécessaire pour l'historique public du Bloc 16 qui filtre sur `rank = 1`) ; XP +150/+50/+50 cumulables sur le top 3, `wins` incrémenté pour le rang 1, `level` recalculé ; puis statut `results_finalized`
  - **Testé** (même méthode de simulation qu'au Bloc 13, pour la même raison : Server Action `useFormState`, pas de bouton HTTP à frapper) : < 10 soumissions → `refunded` sans toucher aux rangs ; 10 soumissions sans vote → classement par score métriques seul, égalité exacte départagée par ancienneté (2 soumissions à vues identiques, la plus ancienne classée devant), XP/wins/level corrects sur le top 3, rien hors top 3 ; second appel sur un challenge déjà finalisé → aucun recalcul, XP/wins inchangés (idempotence vérifiée) ; scénario avec vote → la soumission votée (2e meilleur score métriques) repasse devant le meilleur score métriques non voté grâce aux +50 `merchant_score`, et ce dernier reste bien à `merchant_score = 0` (pas de reset erroné) ; accès par un merchant tiers → erreur ; tentative avant `vote_deadline` → erreur

- 2026-07-04 : Bloc 15 (résultats et déclenchement des payouts) terminé.
  - Page `/merchant/challenges/[id]/results` : un seul bouton "Voir les résultats" (visible seulement après `vote_deadline`) déclenche `viewResultsAction`, qui appelle `finalizeChallengeResultsAction` (Bloc 14, réutilisée sans duplication) puis enchaîne la création des payouts si le challenge est bien finalisé — pas de second bouton séparé. Affiche le classement complet, l'instruction de remboursement manuel si `refunded`, ou le classement + les payouts si `results_finalized`
  - `createPayoutsForChallenge` : 80% net du `prize_pool` réparti selon `prize_distribution`, arrondi à l'inférieur par rang en centimes, reliquat ajouté au 1er (vérifié avec prize_pool=201€ et distribution 34/33/33 : 54,68€/53,06€/53,06€, somme exactement égale au net 160,80€) ; idempotent (un second appel ne recrée pas les payouts)
  - Décision actée avec Natan (pas couverte explicitement par `CLAUDE.md`) : si `stripe.transfers.create` échoue de façon synchrone (erreur API, pas un webhook `transfer.failed` après coup), le payout passe directement à `failed` plutôt que de rester à tort en `awaiting_onboarding` — sinon plus aucun mécanisme ne le reprendrait, le webhook `account.updated` du Bloc 11 ne réagissant qu'à un changement de statut d'onboarding
  - **Bug RLS trouvé et corrigé pendant les tests** : la policy `payouts` d'origine (`schema.sql`) n'autorisait que le *créateur* à lire ses payouts, jamais le *merchant* propriétaire du challenge — la page résultats du pro ne voyait donc jamais ses propres payouts. Nouvelle policy `payouts visibles par le merchant du challenge` ajoutée via migration MCP et reportée dans `schema.sql`, conformément à la règle CLAUDE.md "corriger la policy, jamais désactiver RLS"
  - **Testé** : vérifié au préalable que `stripe.transfers.create` échoue bien réellement sans clé Stripe valide (`StripeAuthenticationError`), confirmant que le `catch` de l'action serait bien déclenché en conditions réelles ; puis simulation de la séquence complète (même limite `useFormState` qu'aux Blocs 13/14) — pages (refunded, attente avant deadline, bouton après deadline, 404 pour un tiers) testées en HTTP réel ; calcul des montants/arrondi/reliquat, statuts `failed`/`awaiting_onboarding`, idempotence et cas `refunded` (aucun payout créé) vérifiés en base
  - **Non testé** : un vrai Transfer Stripe réussi (`status: paid` via webhook), qui nécessite un vrai `STRIPE_SECRET_KEY` — à vérifier dès que Natan fournit une clé de test, comme pour les Blocs 07/11

- 2026-07-04 : Bloc 16 (profil créateur public) terminé.
  - Page `/creators/[username]` (publique, lecture RLS standard uniquement — aucune donnée `payouts` affichée) : avatar (ou initiale par défaut), niveau/XP/wins, badges calculés à la volée (pas stockés — pas de colonne dédiée, évite l'invalidation), historique des victoires dérivé de `submissions.rank = 1`
  - `avatar_url` rendu via `next/image` : ajout de `images.remotePatterns` dans `next.config.mjs` pour le hostname Supabase Storage (déduit de `NEXT_PUBLIC_SUPABASE_URL`), sinon Next rejette l'URL externe au runtime
  - **Bug middleware trouvé et corrigé pendant les tests** : `pathname.startsWith("/creator")` matchait aussi `/creators/[username]` (préfixe commun), donc cette page publique était bloquée et redirigée vers `/login` comme si c'était une route protégée. Fix : comparaison avec le slash final (`"/creator/"`, `"/merchant/"`) dans `src/middleware.ts`. Reverifié après coup que `/creator/dashboard` et `/merchant/dashboard` redirigent toujours correctement un visiteur non connecté
  - Testé contre le serveur dev réel : niveau/XP/wins/4 badges/3 victoires (avec business_name du merchant) tous corrects, username insensible à la casse dans l'URL, 404 sur un username inexistant, profil sans aucune soumission affiche bien "aucun badge"/"aucune victoire"

- 2026-07-04 : Bloc 17 (dashboard créateur) terminé.
  - `/creator/dashboard` : mes soumissions avec statut du challenge (+ rang/score si `results_finalized`), statut onboarding Stripe avec lien vers `/creator/payments` si incomplet, historique des payouts (montants + statuts)
  - `/creator/profile` : édition username + avatar (réutilise `creatorProfileSchema` du Bloc 05, même validation) — conserve l'avatar existant si aucun nouveau fichier n'est fourni, gère le conflit d'unicité (23505) sans planter si le username choisi est déjà pris par un autre compte
  - Labels de statut (`ONBOARDING_STATUS_LABELS`, `PAYOUT_STATUS_LABELS`) extraits dans `src/lib/` — 2e usage de chacun (déjà présents aux Blocs 11/15), même logique d'extraction que `CHALLENGE_STATUS_LABELS` au Bloc 12
  - Testé contre le serveur dev réel : dashboard affiche correctement soumission active + soumission classée (rang #1, score), statut onboarding + lien, payout `awaiting_onboarding` ; page profil pré-remplie avec le username actuel ; redirection onboarding si profil manquant. Mutation testée par simulation (même limite `useFormState` qu'aux Blocs 13/14/15) : changement de username OK, re-soumission du même username sans erreur, doublon avec un autre compte correctement rejeté

- 2026-07-04 : Bloc 18 (landing page) terminé. Design volontairement minimal (mêmes classes Tailwind que le reste du site) — Natan personnalisera l'ensemble du visuel plus tard, pas de passe esthétique dédiée à ce stade.
  - Page `/` : pitch + CTA double vers `/register?role=merchant` et `/register?role=creator`, top 3 challenges actifs (même requête que `/challenges`, limitée à 3)
  - `/register` accepte désormais `?role=merchant|creator` en query param pour présélectionner le radio du formulaire (`RegisterForm` reçoit `initialRole`, avant codé en dur sur `creator`)
  - Testé contre le serveur dev réel : challenge actif affiché, brouillon bien absent, les deux CTA pointent vers les bonnes query strings, `?role=merchant` précoche bien le radio "Pro" (`checked=""` vérifié dans le HTML brut, absent sur "Créateur")
