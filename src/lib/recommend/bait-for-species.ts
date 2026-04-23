/**
 * Rank bait seasonings by how useful they are to catch a specific Pokémon.
 *
 * Scoring is intentionally blunt — we want the UI to surface the berries that
 * actually biais the encounter toward this species, not generic shiny boosters.
 *
 * Priority (from most to least relevant):
 *   1. Type bias matching one of the species types   (base 100)
 *   2. Egg group bias matching one of its egg groups (base 80)
 *   3. Nature bias matching its dominant stat        (base 60)
 *   4. Rarity bucket boost (generic, always useful)  (base 40)
 *   5. Shiny / HA / drops (generic, but eye-catching) (base 25)
 *   6. Bite time / level / other utility             (base 10)
 */

import {
  formatBaitEffects,
  type FormattedBaitEffect,
  type RawBaitEffect,
} from "./bait-effects";

export type SeasoningLike = {
  slug: string;
  itemId: string;
  colour: string | null;
  flavours?: Record<string, number>;
  dominantFlavour?: string | null;
  rawBaitEffects?: RawBaitEffect[];
  baitEffects?: FormattedBaitEffect[];
};

export type SpeciesCtx = {
  primaryType: string;
  secondaryType: string | null;
  /** From species.raw.eggGroups in the mod JSON. */
  eggGroups?: string[];
  /**
   * Index of the strongest base stat (atk / spa / spe / def / spd / hp),
   * used to pick a matching nature booster. Optional — if absent we skip
   * the nature boost scoring.
   */
  strongestStat?: "atk" | "def" | "spa" | "spd" | "spe" | "hp";
};

export type RankedBait = {
  seasoning: SeasoningLike;
  score: number;
  reasons: string[];
  primaryReason: string;
};

function normSub(sub?: string): string {
  return (sub ?? "").replace(/^cobblemon:/, "").toLowerCase();
}

function scoreOneEffect(
  raw: RawBaitEffect,
  species: SpeciesCtx,
): { score: number; reason: string | null } {
  const type = (raw.type ?? "").replace(/^cobblemon:/, "");
  const sub = normSub(raw.subcategory);
  const chance = raw.chance ?? 0;

  const types = [species.primaryType, species.secondaryType].filter(
    (t): t is string => Boolean(t),
  );
  const eggGroups = (species.eggGroups ?? []).map((e) => e.toLowerCase());

  switch (type) {
    case "typing":
      if (types.includes(sub)) {
        return { score: 100 + chance * 20, reason: `+10× ${sub}-type` };
      }
      return { score: 0, reason: null };
    case "egg_group":
      if (eggGroups.includes(sub)) {
        return { score: 80 + chance * 15, reason: `+10× ${sub.replace("_", " ")} egg group` };
      }
      return { score: 0, reason: null };
    case "nature":
      if (species.strongestStat && species.strongestStat === sub) {
        return { score: 60 + chance * 10, reason: `${sub}-boosting nature` };
      }
      return { score: 5 + chance * 3, reason: null };
    case "rarity_bucket":
      return { score: 40 + (raw.value ?? 0) * 2, reason: `rarity +${raw.value ?? 0}` };
    case "shiny_reroll":
      return { score: 25 + (raw.value ?? 1) * 2, reason: `shiny ×${raw.value ?? 1}` };
    case "ha_chance":
      return { score: 25 + chance * 50, reason: "hidden ability" };
    case "drops_reroll":
      return { score: 15, reason: null };
    case "bite_time":
      return { score: 5 + (raw.value ?? 0) * 10, reason: null };
    case "level_raise":
      return { score: 8 + (raw.value ?? 0) * 0.5, reason: null };
    case "iv":
    case "ev":
      return { score: 10 + (raw.value ?? 0) * 0.2, reason: null };
    case "gender_chance":
    case "mark_chance":
    case "friendship":
      return { score: 10 + chance * 5, reason: null };
    default:
      return { score: 0, reason: null };
  }
}

/**
 * Derive the "strongest stat" label (used for nature boost alignment) from a
 * species' base stats map.
 */
export function strongestStatOf(
  baseStats: Record<string, number>,
): SpeciesCtx["strongestStat"] {
  const map: Record<string, SpeciesCtx["strongestStat"]> = {
    hp: "hp",
    attack: "atk",
    defence: "def",
    defense: "def",
    special_attack: "spa",
    special_defence: "spd",
    special_defense: "spd",
    speed: "spe",
  };
  let best: { key: SpeciesCtx["strongestStat"]; val: number } = { key: undefined, val: -1 };
  for (const [k, v] of Object.entries(baseStats)) {
    const mapped = map[k];
    if (!mapped) continue;
    if (v > best.val) best = { key: mapped, val: v };
  }
  return best.key;
}

export function rankBaitsForSpecies(
  seasonings: SeasoningLike[],
  species: SpeciesCtx,
  opts: { limit?: number } = {},
): RankedBait[] {
  const limit = opts.limit ?? 6;
  const ranked: RankedBait[] = [];

  for (const s of seasonings) {
    const effects = s.rawBaitEffects ?? [];
    if (effects.length === 0) continue;
    let score = 0;
    const reasons: string[] = [];
    let primary = "";
    for (const eff of effects) {
      const { score: sc, reason } = scoreOneEffect(eff, species);
      score += sc;
      if (reason) {
        reasons.push(reason);
        if (!primary && (sc >= 40)) primary = reason;
      }
    }
    if (score <= 0) continue;
    ranked.push({
      seasoning: s,
      score,
      reasons,
      primaryReason:
        primary ||
        reasons[0] ||
        (s.baitEffects && s.baitEffects[0]?.title) ||
        "utility",
    });
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}
