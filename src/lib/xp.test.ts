import { describe, expect, it } from "vitest";
import { levelForXp } from "./xp";

describe("levelForXp", () => {
  it.each([
    [0, "Débutant"],
    [99, "Débutant"],
    [100, "Montant"],
    [299, "Montant"],
    [300, "Confirmé"],
    [699, "Confirmé"],
    [700, "Expert"],
    [1499, "Expert"],
    [1500, "Élite"],
    [5000, "Élite"],
  ])("xp=%i -> %s (paliers CLAUDE.md)", (xp, expected) => {
    expect(levelForXp(xp)).toBe(expected);
  });
});
