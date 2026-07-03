// Paliers CLAUDE.md : Débutant 0-99 · Montant 100-299 · Confirmé 300-699 · Expert 700-1499 · Élite 1500+
// Recalculé à chaque changement d'XP (soumission bloc 10, top 3 / victoire bloc 14), jamais figé.
export function levelForXp(xp: number): string {
  if (xp >= 1500) return "Élite";
  if (xp >= 700) return "Expert";
  if (xp >= 300) return "Confirmé";
  if (xp >= 100) return "Montant";
  return "Débutant";
}
