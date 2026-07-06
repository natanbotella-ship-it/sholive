import { describe, expect, it } from "vitest";
import { rankSubmissionsByMetricScore } from "./scoring";

function sub(
  id: string,
  views: number,
  createdAt: string,
  overrides: Partial<{ saves: number; likes: number; shares: number }> = {},
) {
  return {
    id,
    declared_views: views,
    declared_saves: overrides.saves ?? 0,
    declared_likes: overrides.likes ?? 0,
    declared_shares: overrides.shares ?? 0,
    created_at: createdAt,
  };
}

describe("rankSubmissionsByMetricScore", () => {
  it("attribue 50/50 au max et 0 à une soumission sans aucune métrique", () => {
    const [best, worst] = rankSubmissionsByMetricScore([
      sub("a", 1000, "2026-01-01"),
      sub("b", 0, "2026-01-02"),
    ]);
    expect(best.id).toBe("a");
    expect(best.metricScore).toBe(50);
    expect(worst.id).toBe("b");
    expect(worst.metricScore).toBe(0);
  });

  it("retourne 0 pour toutes les soumissions si aucune métrique n'est déclarée", () => {
    const ranked = rankSubmissionsByMetricScore([
      sub("a", 0, "2026-01-01"),
      sub("b", 0, "2026-01-02"),
    ]);
    expect(ranked.every((s) => s.metricScore === 0)).toBe(true);
  });

  it("pondère vues/saves à 0.4 et likes/partages à 0.1 (CLAUDE.md)", () => {
    // a : 100 vues (40 pts bruts) ; b : 400 likes (40 pts bruts) -> score identique
    const [a, b] = rankSubmissionsByMetricScore([
      sub("a", 100, "2026-01-01"),
      sub("b", 0, "2026-01-02", { likes: 400 }),
    ]).sort((x, y) => x.id.localeCompare(y.id));
    expect(a.metricScore).toBeCloseTo(b.metricScore, 10);
  });

  it("départage une égalité de score par la soumission la plus ancienne", () => {
    const ranked = rankSubmissionsByMetricScore([
      sub("later", 100, "2026-01-05"),
      sub("earlier", 100, "2026-01-01"),
    ]);
    expect(ranked[0].id).toBe("earlier");
    expect(ranked[1].id).toBe("later");
  });

  it("gère une liste vide sans lever d'exception", () => {
    expect(rankSubmissionsByMetricScore([])).toEqual([]);
  });
});
