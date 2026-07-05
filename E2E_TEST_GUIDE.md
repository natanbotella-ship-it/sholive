# Guide de test end-to-end — Bloc 19

Ce bloc est différent des précédents : c'est un **parcours manuel**, à dérouler toi-même (Natan) dans le navigateur, pas quelque chose que Claude Code peut simuler via script. Deux raisons : il faut entrer une vraie carte de test Stripe dans un vrai Checkout, et suivre un vrai formulaire d'onboarding Connect hébergé par Stripe — aucune des deux choses n'est simulable sans navigateur réel (pas de Playwright dans ce projet, décision actée au Bloc 03).

Mon rôle ici : préparer ce guide, t'aider à mettre en place les prérequis, injecter les données de remplissage fastidieuses (9 soumissions bidons pour passer le seuil des 10), et corriger les bugs que tu trouveras — un bug à la fois, isolé et commité (jamais en vrac).

## Prérequis avant de commencer

1. **Clé Stripe test** : [dashboard.stripe.com](https://dashboard.stripe.com) → bascule en mode **Test** (coin en haut à droite) → Developers → API keys → copier la **Secret key** (`sk_test_...`) et la **Publishable key** (`pk_test_...`). Colle-les dans `.env.local` :
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

2. **Webhooks en local** : installe la [Stripe CLI](https://stripe.com/docs/stripe-cli), puis dans un terminal séparé (à laisser ouvert pendant tout le test) :
   ```
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Elle affiche un `whsec_...` — remplace la valeur actuelle (temporaire, générée localement) de `STRIPE_WEBHOOK_SECRET` dans `.env.local` par celle-ci.

3. Lance `npm run dev` dans un autre terminal.

4. Garde sous la main : carte de test Stripe **4242 4242 4242 4242**, date d'expiration future quelconque, CVC quelconque, code postal quelconque. Pour l'onboarding Connect Express, Stripe propose en mode test un bouton "remplir automatiquement" ou des valeurs de test suggérées à l'écran — inutile d'inventer un vrai IBAN.

## Simplification assumée : 2 comptes réels, pas 10

Le scoring exige au moins 10 soumissions pour ne pas déclencher le remboursement automatique (`refunded`). Faire manuellement 10 inscriptions créateur + 10 soumissions dans le navigateur n'apporterait rien de plus que ce qui est déjà validé au Bloc 14 (logique de scoring testée en profondeur par simulation). Donc :

- **1 compte créateur "héros"** parcouru intégralement dans le navigateur (inscription, soumission, onboarding Connect réel, réception du payout)
- **9 soumissions de remplissage** injectées directement en base par Claude Code (mêmes valeurs qu'aux tests des Blocs 13/14), pour que le compte total atteigne 10 et que le scoring se déclenche normalement

Dis-moi quand tu es prêt pour cette étape, je les insère au bon moment (après ta soumission réelle, avant le vote).

## Astuce deadlines

`vote_deadline` est toujours `submission_deadline + 7 jours`, non modifiable dans le formulaire. Pour ne pas attendre une semaine, une fois le challenge créé, je peux (avec ton accord) reculer `submission_deadline`/`vote_deadline` directement en base pour qu'elles soient déjà passées — c'est un ajustement de données de test, pas un changement de code.

## Parcours à dérouler

### A. Marchand
- [ ] `/register?role=merchant` — créer un compte pro
- [ ] `/merchant/onboarding` — compléter business_name / ville / téléphone
- [ ] `/merchant/challenges/new` — créer un challenge (prize_pool ≥ 200€, répartition par défaut 50/30/20)
- [ ] Payer via le bouton "Payer et lancer le challenge" avec la carte test 4242... — vérifier la redirection vers Stripe Checkout, le retour sur le site, et que le statut passe à `active`
- [ ] Vérifier dans le terminal `stripe listen` que l'event `checkout.session.completed` est bien reçu et forwardé (200)
- [ ] `/merchant/dashboard` — le challenge apparaît avec le bon statut

### B. Créateur (compte héros)
- [ ] `/register?role=creator` — créer un compte créateur (checkbox 18+ obligatoire)
- [ ] `/creator/onboarding` — choisir un username, uploader un avatar
- [ ] `/challenges` — retrouver le challenge du marchand, ouvrir la page détail
- [ ] `/creator/submit/[id]` — soumettre (lien TikTok + Reels obligatoires, stats déclarées avec des valeurs qui te feront gagner, ex. vues élevées)
- [ ] Vérifier que l'XP créateur augmente de +10 sur `/creator/dashboard`
- [ ] `/creator/payments` — lancer l'onboarding Stripe Connect Express réel, suivre le formulaire hébergé jusqu'au bout
- [ ] Vérifier dans le terminal `stripe listen` que l'event `account.updated` est reçu, et que `stripe_onboarding_status` passe à `complete` sur `/creator/payments`

### C. Remplissage (Claude Code, sur ton signal)
- [ ] 9 soumissions injectées en base pour ce challenge, avec des stats plus basses que celles du compte héros

### D. Vote + scoring + payout
- [ ] (Si besoin) ajuster `submission_deadline`/`vote_deadline` en base pour qu'elles soient passées
- [ ] `/merchant/challenges/[id]/vote` — voter pour le compte héros dans le top 10
- [ ] `/merchant/challenges/[id]/results` — cliquer "Voir les résultats" : vérifie le classement, le rang, le score
- [ ] Vérifier que le payout du compte héros est bien créé avec le bon statut :
  - si l'onboarding Connect a été complété **avant** ce clic → statut `pending` puis `paid` après réception du webhook `transfer.created` (vérifie le terminal `stripe listen`)
  - si l'onboarding est complété **après** → le payout doit démarrer `awaiting_onboarding` puis être repris automatiquement par le webhook `account.updated` une fois l'onboarding fini (revérifie ce cas en particulier, c'est la logique du Bloc 11)
- [ ] `/creator/dashboard` — le payout apparaît avec le bon montant et statut
- [ ] `/creators/[username]` — le badge "Première victoire" et l'historique du challenge gagné apparaissent

## Bugs trouvés

Note ici chaque bug au fur et à mesure (symptôme + étape concernée). On les corrige un par un, jamais en vrac — un fix isolé et commité par bug, comme le reste du projet.

-
