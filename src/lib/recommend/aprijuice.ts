/**
 * Faithful reproduction of the Aprijuice ride-boost formula from
 * `RideBoostsSeasoningProcessor.kt` and
 * `data/cobblemon/mechanics/aprijuices.json`.
 *
 *   1. Pick an apricorn colour (= aprijuice variant). Each colour has a set
 *      of baked-in RidingStat deltas (e.g. RED = +2 ACCELERATION, -1 STAMINA).
 *   2. Drop one or more berries as seasoning. Their flavour values are summed
 *      per flavour across all seasonings. For each flavour total, look up the
 *      matching RidingStat, then convert the total into points via the
 *      threshold table (15 → 1, 35 → 2, 45 → 3, 55 → 4, 75 → 5, 105 → 6).
 *   3. Add apricorn deltas to the per-stat points. Entries that end at 0 are
 *      dropped from the component.
 *
 * Flavour ↔ RidingStat mapping (from RidingStat.kt):
 *   SPICY  → ACCELERATION
 *   DRY    → SKILL
 *   SWEET  → SPEED
 *   SOUR   → STAMINA
 *   BITTER → JUMP
 */

export type RidingStat = "ACCELERATION" | "SKILL" | "SPEED" | "STAMINA" | "JUMP";
export type Flavour = "SPICY" | "DRY" | "SWEET" | "SOUR" | "BITTER";
export type Apricorn =
  | "BLACK"
  | "BLUE"
  | "GREEN"
  | "PINK"
  | "RED"
  | "WHITE"
  | "YELLOW";

export const FLAVOUR_TO_STAT: Record<Flavour, RidingStat> = {
  SPICY: "ACCELERATION",
  DRY: "SKILL",
  SWEET: "SPEED",
  SOUR: "STAMINA",
  BITTER: "JUMP",
};

/** From data/cobblemon/mechanics/aprijuices.json. */
export const APRICORN_EFFECTS: Record<Apricorn, Partial<Record<RidingStat, number>>> = {
  BLACK: {},
  BLUE: { SKILL: 2, JUMP: -1 },
  GREEN: { JUMP: 2, SPEED: -1 },
  PINK: { SPEED: 2, ACCELERATION: -1 },
  RED: { ACCELERATION: 2, STAMINA: -1 },
  WHITE: {
    SPEED: -2,
    STAMINA: -2,
    JUMP: -2,
    ACCELERATION: -2,
    SKILL: -2,
  },
  YELLOW: { STAMINA: 2, SKILL: -1 },
};

/** Threshold table: min flavour total → points. Ordered by threshold ascending. */
const THRESHOLDS: Array<[number, number]> = [
  [15, 1],
  [35, 2],
  [45, 3],
  [55, 4],
  [75, 5],
  [105, 6],
];

function pointsForFlavourTotal(total: number): number {
  let pts = 0;
  for (const [min, value] of THRESHOLDS) {
    if (total >= min) pts = value;
    else break;
  }
  return pts;
}

export type BerrySeasoning = {
  slug: string;
  itemId: string;
  flavours: Partial<Record<Flavour, number>>;
};

export type JuiceRecipe = {
  apricorn: Apricorn;
  berries: BerrySeasoning[];
};

export type JuiceResult = {
  apricorn: Apricorn;
  berrySlugs: string[];
  flavourTotals: Record<Flavour, number>;
  pointsFromFlavours: Record<RidingStat, number>;
  pointsFromApricorn: Record<RidingStat, number>;
  statBoosts: Partial<Record<RidingStat, number>>;
  /** List of concrete sentences describing each non-zero stat line. */
  summary: Array<{ stat: RidingStat; delta: number; fromBerries: number; fromApricorn: number }>;
};

export function cookAprijuice(recipe: JuiceRecipe): JuiceResult {
  const flavourTotals: Record<Flavour, number> = {
    SPICY: 0,
    DRY: 0,
    SWEET: 0,
    SOUR: 0,
    BITTER: 0,
  };
  for (const b of recipe.berries) {
    for (const [f, v] of Object.entries(b.flavours)) {
      const key = f as Flavour;
      if (flavourTotals[key] === undefined) continue;
      flavourTotals[key] += v ?? 0;
    }
  }

  const pointsFromFlavours: Record<RidingStat, number> = {
    ACCELERATION: 0,
    SKILL: 0,
    SPEED: 0,
    STAMINA: 0,
    JUMP: 0,
  };
  for (const f of Object.keys(flavourTotals) as Flavour[]) {
    const stat = FLAVOUR_TO_STAT[f];
    pointsFromFlavours[stat] = pointsForFlavourTotal(flavourTotals[f]);
  }

  const apricornBase = APRICORN_EFFECTS[recipe.apricorn] ?? {};
  const pointsFromApricorn: Record<RidingStat, number> = {
    ACCELERATION: apricornBase.ACCELERATION ?? 0,
    SKILL: apricornBase.SKILL ?? 0,
    SPEED: apricornBase.SPEED ?? 0,
    STAMINA: apricornBase.STAMINA ?? 0,
    JUMP: apricornBase.JUMP ?? 0,
  };

  const statBoosts: Partial<Record<RidingStat, number>> = {};
  const summary: JuiceResult["summary"] = [];
  for (const stat of Object.keys(pointsFromFlavours) as RidingStat[]) {
    const total = pointsFromFlavours[stat] + pointsFromApricorn[stat];
    if (total === 0) continue;
    statBoosts[stat] = total;
    summary.push({
      stat,
      delta: total,
      fromBerries: pointsFromFlavours[stat],
      fromApricorn: pointsFromApricorn[stat],
    });
  }
  summary.sort((a, b) => b.delta - a.delta);

  return {
    apricorn: recipe.apricorn,
    berrySlugs: recipe.berries.map((b) => b.slug),
    flavourTotals,
    pointsFromFlavours,
    pointsFromApricorn,
    statBoosts,
    summary,
  };
}
