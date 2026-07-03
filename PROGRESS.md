# PROGRESS.md — Sholive

Claude Code : mets à jour ce fichier après chaque bloc terminé (coche + une ligne de note si pertinent). Au début de chaque nouvelle session, lis ce fichier avant de commencer.

- [ ] Bloc 00 — Setup projet
- [ ] Bloc 01 — Base de données
- [ ] Bloc 02 — Inscription (auth)
- [ ] Bloc 03 — Connexion + protection de routes
- [ ] Bloc 04 — Onboarding profil marchand
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
  - `vote_deadline` devient une colonne générée (submission_deadline + 7j), plus un champ de formulaire
  - Ajout table `merchant_contacts` (téléphone) + policies `profiles`/`merchant_profiles` resserrées : email et téléphone n'étaient pas censés être publics avec les policies RLS d'origine
  - Détail complet des autres corrections (statuts orphelins, RLS payouts, forward reference metric_score bloc13/14, etc.) dans l'historique de conversation Claude Code du 2026-07-03
