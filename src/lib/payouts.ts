import { eurosToCents } from "./money";

export type PrizeDistribution = Record<string, number>;

export type PayoutShare = {
  rank: number;
  cents: number;
};

// 80% net du prize_pool réparti selon prize_distribution, arrondi à
// l'inférieur par rang en centimes, reliquat de centimes ajouté au 1er
// (CLAUDE.md). Extraite de createPayoutsForChallenge (pre-mortem 2026-07-06)
// pour être testable indépendamment de la DB/Stripe.
export function computePayoutShares(
  prizePoolEuros: number,
  distribution: PrizeDistribution,
  ranks: number[],
): PayoutShare[] {
  const prizePoolCents = eurosToCents(prizePoolEuros);
  const netCents = Math.floor(prizePoolCents * 0.8);

  const shares = ranks.map((rank) => ({
    rank,
    cents: Math.floor((netCents * (distribution[String(rank)] ?? 0)) / 100),
  }));

  const distributedCents = shares.reduce((sum, s) => sum + s.cents, 0);
  const remainderCents = netCents - distributedCents;
  const firstRankShare = shares.find((s) => s.rank === 1);
  if (firstRankShare) {
    firstRankShare.cents += remainderCents;
  }

  return shares;
}
