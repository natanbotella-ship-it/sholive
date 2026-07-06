import { defineConfig } from "vitest/config";

// Tests unitaires sur la logique pure (scoring, XP, calcul des payouts) — le
// coeur financier/métier n'avait aucun test rejouable avant la revue du
// 2026-07-06, seulement des scripts de vérification manuels jetés après usage.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
