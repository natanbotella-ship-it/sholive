// Le rendu date/heure se fait dans des Server Components : sans timeZone explicite,
// toLocaleString utilise le fuseau du SERVEUR (UTC sur Vercel), pas celui du visiteur —
// les deadlines s'affichaient décalées de 1-2 h en production. MVP exclusivement
// lyonnais (CLAUDE.md) → Europe/Paris en dur.
const TIME_ZONE = "Europe/Paris";

export function formatDateTimeFr(date: string | Date): string {
  // dateStyle/timeStyle courts : "05/07/2026 13:25" — les secondes n'apportent
  // rien à l'utilisateur pour une deadline (refonte design 2026-07-07).
  return new Date(date).toLocaleString("fr-FR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDateFr(date: string | Date): string {
  return new Date(date).toLocaleDateString("fr-FR", { timeZone: TIME_ZONE });
}
