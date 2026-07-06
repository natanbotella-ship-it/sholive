export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  // Fenêtre de litige de 72h après la finalisation (pre-mortem 2026-07-06) : le
  // Transfer n'est pas encore tenté, le temps qu'une fraude éventuelle soit signalée.
  awaiting_review: "En cours de vérification",
  awaiting_onboarding: "En attente que le créateur active ses paiements",
  pending: "Transfert en cours",
  paid: "Payé",
  failed: "Échec du virement",
  refunded: "Remboursé",
};
