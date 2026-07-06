// Constantes de temporisation introduites au pre-mortem technique du 2026-07-06 —
// partagées entre les Server Actions et le cron (src/app/api/cron/*).

// Aucun scoring/Transfer n'existait auparavant sans clic volontaire du pro : un pro qui
// oublie ou n'a plus intérêt à revenir laisse des gagnants jamais payés pour un prize
// pool déjà encaissé. Le cron finalise automatiquement tout challenge dont vote_deadline
// est dépassée depuis plus longtemps que cette grâce, laissée pour que le pro agisse
// lui-même en premier (bouton "Voir les résultats").
export const AUTO_FINALIZE_GRACE_HOURS = 48;

// Le scoring reposant entièrement sur des stats auto-déclarées (aucune vérification
// externe possible au MVP), un fraudeur découvert après la finalisation doit avoir une
// fenêtre pour être signalé avant qu'un Transfer réel ne parte. Cf.
// challenges.results_finalized_at/results_disputed_at, payouts.status 'awaiting_review'.
export const DISPUTE_WINDOW_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR_MS);
}

export function isDisputeWindowElapsed(resultsFinalizedAt: string): boolean {
  return Date.now() >= new Date(resultsFinalizedAt).getTime() + DISPUTE_WINDOW_HOURS * HOUR_MS;
}
