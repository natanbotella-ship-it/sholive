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

  it("amortit un outlier isolé au lieu d'écraser les autres à ~0 (anti-fraude, pre-mortem 2026-07-06)", () => {
    const ranked = rankSubmissionsByMetricScore([
      sub("honest-1", 100, "2026-01-01"),
      sub("honest-2", 100, "2026-01-02"),
      sub("fraud", 1_000_000, "2026-01-03"),
    ]);
    const fraud = ranked.find((s) => s.id === "fraud")!;
    const honest = ranked.filter((s) => s.id !== "fraud");

    expect(fraud.metricScore).toBe(50); // le max reste à 50
    // Avec une normalisation linéaire, les honnêtes tomberaient à ~0.005/50.
    // Le rapport logarithmique les maintient à un niveau significatif.
    for (const h of honest) {
      expect(h.metricScore).toBeGreaterThan(5);
    }
    // L'ordre relatif (fraud > honest, honest à égalité) reste inchangé.
    expect(ranked[0].id).toBe("fraud");
  });

  it("conserve l'ordre du classement quel que soit l'écart (log1p est strictement croissant)", () => {
    const ranked = rankSubmissionsByMetricScore([
      sub("low", 10, "2026-01-01"),
      sub("mid", 1000, "2026-01-02"),
      sub("high", 100_000, "2026-01-03"),
    ]);
    expect(ranked.map((s) => s.id)).toEqual(["high", "mid", "low"]);
  });
});
