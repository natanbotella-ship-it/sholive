# PROGRESS.md — Sholive

Claude Code : mets à jour ce fichier après chaque bloc terminé (coche + une ligne de note si pertinent). Au début de chaque nouvelle session, lis ce fichier avant de commencer.

- [x] Bloc 00 — Setup projet
- [x] Bloc 01 — Base de données
- [x] Bloc 02 — Inscription (auth)
- [x] Bloc 03 — Connexion + protection de routes
- [x] Bloc 04 — Onboarding profil marchand
- [ ] Bloc 05 — Onboarding profil créateur
- [ ] Bloc 06 — Création de challenge (sans paiement)
- [ ] Bloc 07 — Stripe Checkout : paiement du prize pool
- [ ] Bloc 08 — Liste publique des challenges
- [ ] Bloc 09 — Page détail challenge
- [ ] Bloc 10 — Soumission créateur
- [ ] Bloc 11 — Stripe Connect : onboarding créateur
- [ ] Bloc 12 — Dashboard pro : suivi challenge
- [ ] Bloc 13 — Vote pro sur shortlist
- [ ] Bloc 14 — Scoring et calcul final
- [ ] Bloc 15 — Résultats et déclenchement des payouts
- [ ] Bloc 16 — Profil créateur public
- [ ] Bloc 17 — Dashboard créateur
- [ ] Bloc 18 — Landing page
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
