export type SubmissionMetrics = {
  id: string;
  declared_views: number;
  declared_saves: number;
  declared_likes: number;
  declared_shares: number;
  created_at: string;
};

function rawMetricScore(s: SubmissionMetrics): number {
  return (
    s.declared_views * 0.4 +
    s.declared_saves * 0.4 +
    s.declared_likes * 0.1 +
    s.declared_shares * 0.1
  );
}

// Score métriques (/50) normalisé par un rapport LOGARITHMIQUE au max du challenge
// (pre-mortem 2026-07-06, déviation délibérée de la normalisation linéaire d'origine
// de CLAUDE.md — mis à jour dans CLAUDE.md en conséquence). Avec un rapport linéaire,
// une seule soumission aux stats déclarées gonflées écrasait le score de toutes les
// autres à ~0 (raw/max), donnant à un unique fraudeur le contrôle total du classement
// et de la shortlist soumise au vote. log1p est strictement croissant : l'ordre du
// classement est inchangé, seul l'écart avec un outlier isolé est amorti.
// Égalités départagées par le score le plus haut puis la soumission la plus ancienne
// (même règle qu'au classement final du Bloc 14). Réutilisée telle quelle au Bloc 13
// (calcul à la volée pour la shortlist) et au Bloc 14 (persistance de metric_score).
export function rankSubmissionsByMetricScore<T extends SubmissionMetrics>(
  submissions: T[],
): (T & { metricScore: number })[] {
  const maxRaw = Math.max(0, ...submissions.map(rawMetricScore));

  return submissions
    .map((s) => ({
      ...s,
      metricScore:
        maxRaw > 0 ? (Math.log1p(rawMetricScore(s)) / Math.log1p(maxRaw)) * 50 : 0,
    }))
    .sort((a, b) => {
      const diff = b.metricScore - a.metricScore;
      if (diff !== 0) return diff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}
