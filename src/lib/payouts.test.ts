import { describe, expect, it } from "vitest";
import { computePayoutShares } from "./payouts";

const DEFAULT_DISTRIBUTION = { "1": 50, "2": 30, "3": 20 };

describe("computePayoutShares", () => {
  it("répartit 500€ selon la distribution par défaut sans reliquat (exemple CLAUDE.md)", () => {
    const shares = computePayoutShares(500, DEFAULT_DISTRIBUTION, [1, 2, 3]);
    expect(shares).toEqual([
      { rank: 1, cents: 20000 }, // 200€
      { rank: 2, cents: 12000 }, // 120€
      { rank: 3, cents: 8000 }, // 80€
    ]);
    expect(shares.reduce((sum, s) => sum + s.cents, 0)).toBe(40000); // net = 80% de 500€
  });

  it("ajoute le reliquat de centimes au 1er (exemple vérifié au Bloc 15 : 201€, 34/33/33)", () => {
    const shares = computePayoutShares(
      201,
      { "1": 34, "2": 33, "3": 33 },
      [1, 2, 3],
    );
    const netCents = Math.floor(20100 * 0.8); // 16080
    const total = shares.reduce((sum, s) => sum + s.cents, 0);
    expect(total).toBe(netCents);
    expect(shares.find((s) => s.rank === 1)?.cents).toBe(5468); // 54,68€
    expect(shares.find((s) => s.rank === 2)?.cents).toBe(5306); // 53,06€
    expect(shares.find((s) => s.rank === 3)?.cents).toBe(5306); // 53,06€
  });

  it("la somme des parts égale toujours exactement le net, quel que soit l'arrondi", () => {
    for (const prizePool of [200, 200.01, 333.33, 999.99, 1234.56]) {
      const shares = computePayoutShares(prizePool, DEFAULT_DISTRIBUTION, [1, 2, 3]);
      const netCents = Math.floor(Math.round(prizePool * 100) * 0.8);
      const total = shares.reduce((sum, s) => sum + s.cents, 0);
      expect(total).toBe(netCents);
    }
  });
});
