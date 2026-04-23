import type { BaitEffect } from "@/lib/db/schema";

export type BaitRecommendation = {
  itemId: string;
  slug: string;
  score: number;
  reasons: string[];
  effects: Array<Record<string, unknown>>;
};

/**
 * Ranks bait effects for a given species by inspecting their effect payloads.
 * Pure: takes DTOs, returns sorted DTOs. No DB access.
 */
export function rankBaitsFor(
  baits: BaitEffect[],
  opts: { primaryType: string; preferredFlavours?: string[] | null },
): BaitRecommendation[] {
  const out: BaitRecommendation[] = [];
  for (const b of baits) {
    const reasons: string[] = [];
    let score = 0;
    for (const effect of b.effects) {
      const type = (effect as { type?: string }).type;
      const chance = (effect as { chance?: number }).chance ?? 0;
      if (type === "cobblemon:shiny_reroll") {
        // shiny always ranks highest: baseline weight 50 dominates other effects
        score += 50 + chance * 10;
        reasons.push("shiny_reroll");
      } else if (type === "cobblemon:hidden_ability") {
        score += 25 + chance * 10;
        reasons.push("hidden_ability");
      } else if (type === "cobblemon:nature") {
        score += chance * 5;
        reasons.push("nature_boost");
      } else if (type === "cobblemon:level") {
        score += chance * 2;
        reasons.push("level_boost");
      } else if (typeof type === "string") {
        score += chance;
        reasons.push(type.replace(/^cobblemon:/, ""));
      }
    }
    if (b.effects.length === 0) reasons.push("baseline");
    out.push({
      itemId: b.itemId,
      slug: b.slug,
      score,
      reasons,
      effects: b.effects,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function topBaits(
  baits: BaitEffect[],
  opts: { primaryType: string; preferredFlavours?: string[] | null; limit?: number },
): BaitRecommendation[] {
  const limit = opts.limit ?? 5;
  return rankBaitsFor(baits, opts).slice(0, limit);
}
