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

// Score métriques (/50) normalisé par rapport au max du challenge (CLAUDE.md).
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
      metricScore: maxRaw > 0 ? (rawMetricScore(s) / maxRaw) * 50 : 0,
    }))
    .sort((a, b) => {
      const diff = b.metricScore - a.metricScore;
      if (diff !== 0) return diff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}
