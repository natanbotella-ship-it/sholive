# BUILD_BLOCKS.md — Sholive

20 blocs. Copie-colle UN bloc à la fois dans Claude Code, dans l'ordre. Ne saute jamais un bloc, ne combine jamais deux blocs dans un seul prompt. Après chaque bloc : teste, commit, coche la case dans `PROGRESS.md`, `/clear` avant le bloc suivant.

---

## Bloc 00 — Setup projet
Initialise un projet Next.js 14 (App Router, TypeScript, Tailwind). Configure le client Supabase (browser + server). Ajoute les variables d'env nécessaires dans `.env.local.example` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Configure Tailwind avec la couleur primaire `#7C3AED` et la police Inter. Vérifie que `npm run dev` fonctionne. Ne code aucune page métier à cette étape.

## Bloc 01 — Base de données
Pas de code. Rappelle-moi (Natan) d'exécuter `schema.sql` dans le SQL Editor Supabase, et vérifie via le client Supabase que les 8 tables existent (dont `merchant_contacts`) et que RLS est actif dessus.

## Bloc 02 — Inscription (auth)
Page `/register`. Formulaire email + mot de passe + choix du rôle (creator/merchant). Si role = creator, checkbox obligatoire "Je certifie avoir 18 ans ou plus" — bloque la soumission si non cochée. Utilise Supabase Auth (email/password) via `signUp({ options: { data: { role, age_confirmed } } })` — la row `profiles` (dont `age_confirmed_at`) est créée automatiquement par le trigger DB `handle_new_user` défini dans `schema.sql`, ne pas recréer cette logique côté app. Validation Zod sur le formulaire.

## Bloc 03 — Connexion + protection de routes
Page `/login`, page `/forgot-password`. Middleware Next.js qui protège les routes `/creator/*` et `/merchant/*` selon le rôle stocké en session — redirige vers `/login` si non connecté, vers la mauvaise section si mauvais rôle.

## Bloc 04 — Onboarding profil marchand
Après inscription merchant, formulaire de complétion : `business_name`, `city` (Lyon par défaut), `phone`. Server Action qui crée la row `merchant_profiles` (business_name, city) liée au `user_id`, puis la row `merchant_contacts` (phone) liée au `merchant_id` créé — deux tables séparées car `merchant_profiles` est public et `merchant_contacts` ne doit jamais l'être.

## Bloc 05 — Onboarding profil créateur
Après inscription creator, formulaire de complétion : `username` (unique, validé), upload avatar vers Supabase Storage. Server Action qui crée la row `creator_profiles`.

## Bloc 06 — Création de challenge (sans paiement)
Page `/merchant/challenges/new`. Formulaire complet : titre, description, brief structuré (`{ concept, consignes[], hashtags_obligatoires[], exemples_inspiration?[] }`), prize_pool (min 200€, erreur claire sinon), prize_distribution (défaut 50/30/20, éditable dans les bornes 40-60/20-35/10-25, la somme doit faire 100 — validation Zod), submission_deadline. Pas de champ `vote_deadline` dans le formulaire : elle est calculée automatiquement en DB (colonne générée = submission_deadline + 7 jours). Server Action qui crée le challenge en statut `draft`. Pas de Stripe à cette étape.

## Bloc 07 — Stripe Checkout : paiement du prize pool
Après création du challenge en `draft`, bouton "Payer et lancer le challenge". Crée une Stripe Checkout Session pour le montant du prize_pool, stocke `stripe_checkout_session_id` et passe `status` à `awaiting_payment`. Route API `/api/webhooks/stripe` qui écoute `checkout.session.completed` : passe `payment_status` à `paid` et `status` à `active`. Utilise le webhook secret pour vérifier la signature.

## Bloc 08 — Liste publique des challenges
Page `/challenges`. Liste les challenges `status = active` ET `submission_deadline > now()` (pas de cron qui bascule le statut à l'expiration, donc le filtre se fait sur la date), avec titre, business_name (via `merchant_profiles`, jointure publique), prize_pool, deadline. Filtre simple par ville (Lyon uniquement pour l'instant, mais code générique).

## Bloc 09 — Page détail challenge
Page `/challenges/[id]`. Affiche le brief complet, prize pool, répartition, deadlines, nombre de soumissions actuelles. Bouton "Participer" visible seulement si connecté en tant que creator, et si `submission_deadline` non dépassée.

## Bloc 10 — Soumission créateur
Page `/creator/submit/[id]`. Formulaire : lien TikTok (obligatoire), lien Reels (obligatoire), lien Shorts (optionnel), stats déclarées (vues, saves, likes, partages). Bloque si `submission_deadline` dépassée. Validation des URLs par domaine (TikTok : `tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com` ; Reels : `instagram.com/reel/`, `instagram.com/p/` ; Shorts : `youtube.com/shorts/`, `youtu.be`). Server Action qui crée la row `submissions`, +10 XP au creator (recalcule aussi `level`).

## Bloc 11 — Stripe Connect : onboarding créateur
Page `/creator/payments`. Bouton "Activer mes paiements" — crée un compte Stripe Connect Express (`stripe_account_id`), génère un Account Link, redirige vers le formulaire hébergé Stripe. Gère le retour (`return_url` / `refresh_url`). Le webhook `account.updated` met à jour `stripe_onboarding_status` (`pending` → `complete` ou `restricted`) ; **si le nouveau statut est `complete`**, il doit aussi chercher les `payouts` de ce créateur au statut `awaiting_onboarding` et déclencher immédiatement leur Transfer Stripe (statut `pending`) — c'est le seul mécanisme qui débloque un payout resté en attente après `results_finalized`. Écritures via service role.

## Bloc 12 — Dashboard pro : suivi challenge
Page `/merchant/dashboard` (liste des challenges du merchant avec statut) et `/merchant/challenges/[id]` (détail : liste des soumissions reçues, stats déclarées, liens vidéos).

## Bloc 13 — Vote pro sur shortlist
Page `/merchant/challenges/[id]/vote`. Si `submission_deadline` est dépassée et que `status` du challenge est encore `active`, bascule-le d'abord en `voting` (transition paresseuse, pas de cron). Affiche le top 10 des soumissions triées par `metric_score` **calculé à la volée** avec la même fonction de formule que le bloc 14 (la colonne DB `metric_score` n'est pas encore remplie à ce stade). Le pro sélectionne UNE soumission gagnante. Server Action (client service role, écriture cross-user) qui crée la row `votes` et attribue 50 pts `merchant_score` au gagnant, 0 aux autres. Bloque après la `vote_deadline` (J+7) — si dépassé, affiche que l'algo décidera seul.

## Bloc 14 — Scoring et calcul final
Server Action déclenchée par le pro via le bouton "Voir les résultats" de la page résultats (bloc 15), visible seulement après `vote_deadline`. Pour le challenge donné : si moins de 10 soumissions, passe directement `status` à `refunded` et s'arrête (pas de scoring, pas de payout — cf. bloc 15). Sinon, calcule `metric_score` normalisé sur 50 pts pour chaque soumission (même fonction de formule que le bloc 13) et le persiste, additionne `merchant_score` (ne le remet à 0 que si aucune row `votes` n'existe pour ce challenge — sinon il respecte le vote du bloc 13 tel quel), produit `total_score`, classe les soumissions et persiste `rank` (égalités départagées par `metric_score` le plus haut puis par soumission la plus ancienne). Attribue XP (+50 top 3, +100 victoire, cumulables : le gagnant reçoit +150) et recalcule `level`, incrémente `wins` du gagnant. Toutes ces écritures se font via le client service role (cross-user). Passe le challenge en statut `results_finalized`.

## Bloc 15 — Résultats et déclenchement des payouts
Page `/merchant/challenges/[id]/results`, avec le bouton "Voir les résultats" qui déclenche le bloc 14 puis affiche son résultat. Si le challenge est passé `refunded` (< 10 soumissions), affiche l'instruction de remboursement **intégral** manuel pour Natan (commission Sholive incluse), pas de payout créé. Sinon, affiche le classement final et une Server Action (service role) crée les rows `payouts` pour les 3 premiers selon `prize_distribution` des 80% nets — montants calculés en centimes, arrondis à l'inférieur par rang, le reliquat de centimes ajouté à la part du 1er. Si le creator gagnant a `stripe_onboarding_status = complete`, déclenche un Stripe Transfer immédiatement (statut `pending`, passera à `paid`/`failed` via les webhooks `transfer.created`/`transfer.failed` du bloc 07) ; sinon statut reste `awaiting_onboarding` (repris plus tard par le webhook du bloc 11).

## Bloc 16 — Profil créateur public
Page `/creators/[username]`. Affiche avatar, niveau, XP, wins, badges (Premier challenge, Première victoire, 3 victoires, 10 soumissions — calculés à la volée ou stockés), historique des challenges gagnés — dérivé de `submissions` où `creator_id` = ce créateur et `rank = 1` sur des challenges `results_finalized` (table publique), jamais de `payouts` (RLS réservée au créateur lui-même, montants non affichés publiquement).

## Bloc 17 — Dashboard créateur
Page `/creator/dashboard` (mes soumissions en cours, statuts) et `/creator/profile` (édition profil, avatar). Affiche aussi le statut Stripe onboarding avec lien vers `/creator/payments` si incomplet, et l'historique de payouts avec montants et statuts.

## Bloc 18 — Landing page
Page `/`. Pitch pro et créateur, CTA double (je suis un pro / je suis un créateur), quelques challenges actifs en avant, design cohérent avec le reste (violet #7C3AED, Inter).

## Bloc 19 — Tests end-to-end
Parcours complet manuel guidé : inscription merchant → création challenge → paiement Stripe test → inscription creator → soumission → vote pro → scoring → onboarding Stripe Connect test → déclenchement payout test. Liste les bugs trouvés, ne les corrige pas en vrac — un bug = un fix isolé et commité.
