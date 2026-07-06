// Centralise les conversions euros <-> centimes (pre-mortem 2026-07-06) : ces
// calculs étaient dispersés en ×100/÷100 inline dans plusieurs Server Actions,
// un point d'entrée unique évite qu'une conversion diverge des autres.
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}
