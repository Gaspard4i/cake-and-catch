/**
 * Reverse aprijuice solver — v2.
 *
 * The earlier version asked users to rank stats. That was too blunt: a
 * player might want Speed + Stamina equal and higher than Accel/Skill.
 * Ranks can't express that. So instead we let the user:
 *
 *   1. Tell us which berries and apricorns they own in-game.
 *   2. Spend a budget of points across the 5 ride stats however they like.
 *   3. Get the closest achievable aprijuice (apricorn + up to 3 berries drawn
 *      from what they own).
 *
 * Algorithm:
 *   - The cook() function is pure and <1 ms. We brute-force every
 *     (owned apricorn × multiset of ≤3 owned berries) combination.
 *   - The pool is capped per-flavour to keep the search space small: for
 *     each of the 5 flavours we keep the user's top-3 berries by that
 *     flavour's magnitude. Gives ≤ 15 candidate berries → ≤ ~680
 *     multiset-of-3 combos × 7 apricorns = ~5k cook() calls. Fast.
 *   - Score = -L2 distance between the desired `targetBoosts` vector and
 *     the produced `statBoosts` vector, with a small penalty for net-
 *     negative stats the user did not request (prevents WHITE apricorn
 *     from winning just because the ones the user asked for happen to
 *     align).
 *   - The budget is whatever the user assigned; we never cap it server-
 *     side. The UI is responsible for enforcing `sum(target) ≤ budget`.
 */

import {
  APRICORN_EFFECTS,
  FLAVOUR_TO_STAT,
  cookAprijuice,
  type Apricorn,
  type BerrySeasoning,
  type Flavour,
  type JuiceResult,
  type RidingStat,
} from "./aprijuice";

const DEFAULT_APRICORNS: Apricorn[] = [
  "RED",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PINK",
  "BLACK",
  "WHITE",
];
const MAX_SEASONINGS = 3;

export const RIDE_STATS: RidingStat[] = [
  "ACCELERATION",
  "SKILL",
  "SPEED",
  "STAMINA",
  "JUMP",
];

export type TargetBoosts = Partial<Record<RidingStat, number>>;

export type Suggestion = {
  apricorn: Apricorn;
  berrySlugs: string[];
  result: JuiceResult;
  /** L2 distance from the target vector (lower is better). */
  distance: number;
};

/** Pick the dominant flavour of a berry. */
function dominantFlavour(b: BerrySeasoning): Flavour | null {
  let best: Flavour | null = null;
  let max = 0;
  for (const [f, v] of Object.entries(b.flavours) as Array<[Flavour, number]>) {
    if ((v ?? 0) > max) {
      max = v ?? 0;
      best = f;
    }
  }
  return best;
}

/**
 * Generate all multiset combinations of size ≤ maxSize from a pool.
 * Multiset because Cobblemon lets you stack the same seasoning slug
 * across distinct slots. Includes the empty selection.
 */
function* multisetCombos<T>(
  pool: T[],
  maxSize: number,
): Generator<T[]> {
  yield [];
  const rec = function* (start: number, acc: T[]): Generator<T[]> {
    if (acc.length >= maxSize) return;
    for (let i = start; i < pool.length; i++) {
      const next = [...acc, pool[i]];
      yield next;
      yield* rec(i, next);
    }
  };
  yield* rec(0, []);
}

/** Clamp a berry pool to the top K per-flavour to keep the search small. */
function buildBerryPool(
  berries: BerrySeasoning[],
  perFlavour = 3,
): BerrySeasoning[] {
  const picks = new Map<string, BerrySeasoning>();
  for (const f of Object.keys(FLAVOUR_TO_STAT) as Flavour[]) {
    const ranked = berries
      .filter((b) => (b.flavours[f] ?? 0) > 0)
      .sort((a, c) => (c.flavours[f] ?? 0) - (a.flavours[f] ?? 0))
      .slice(0, perFlavour);
    for (const b of ranked) picks.set(b.slug, b);
  }
  return [...picks.values()];
}

/**
 * L2 distance between target and actual stat vector. Stats listed in
 * `ignored` are excluded from BOTH the distance and the negative
 * penalty — the user explicitly said "I don't care about that stat",
 * so the solver must neither aim for 0 nor avoid negatives there.
 */
function distance(
  target: TargetBoosts,
  actual: Partial<Record<RidingStat, number>>,
  ignored: Set<RidingStat>,
): number {
  let sum = 0;
  for (const stat of RIDE_STATS) {
    if (ignored.has(stat)) continue;
    const t = target[stat] ?? 0;
    const a = actual[stat] ?? 0;
    sum += (t - a) ** 2;
  }
  // Gentle penalty for NEGATIVE stats on stats the user didn't target
  // AND didn't ignore. Prevents WHITE apricorn from winning by alignment.
  for (const stat of RIDE_STATS) {
    if (ignored.has(stat)) continue;
    const a = actual[stat] ?? 0;
    if (a < 0 && !(stat in target)) sum += a * a * 0.25;
  }
  return Math.sqrt(sum);
}

/**
 * Per-stat ceiling ("how high can that single stat realistically go?").
 *
 * Each berry can only sit in ONE of the 3 seasoning slots at a time. To
 * push a stat as high as possible we dedicate all 3 slots to its flavour.
 * So per stat: pick the 3 owned berries richest in that flavour, sum
 * their flavour magnitude, convert through the threshold table, then add
 * the best positive apricorn contribution for that stat.
 *
 * This is an *independent* ceiling per stat (assumes the user spends
 * everything on this one stat). The global achievable budget is NOT
 * the sum of these — see totalAchievableBudget.
 */
export function achievableMaxPerStat(
  berries: BerrySeasoning[],
  apricorns: Apricorn[],
): Record<RidingStat, number> {
  const THRESHOLDS: Array<[number, number]> = [
    [15, 1], [35, 2], [45, 3], [55, 4], [75, 5], [105, 6],
  ];
  const ptsForFlavourTotal = (total: number) => {
    let pts = 0;
    for (const [min, v] of THRESHOLDS) {
      if (total >= min) pts = v;
      else break;
    }
    return pts;
  };

  const out: Record<RidingStat, number> = {
    ACCELERATION: 0, SKILL: 0, SPEED: 0, STAMINA: 0, JUMP: 0,
  };

  const flavourToStat = FLAVOUR_TO_STAT;
  for (const f of Object.keys(flavourToStat) as Flavour[]) {
    const stat = flavourToStat[f];
    const top3 = berries
      .map((b) => b.flavours[f] ?? 0)
      .filter((v) => v > 0)
      .sort((a, b) => b - a)
      .slice(0, MAX_SEASONINGS)
      .reduce((s, v) => s + v, 0);
    const berryPts = ptsForFlavourTotal(top3);

    let bestApricorn = 0;
    for (const ap of apricorns) {
      const delta = APRICORN_EFFECTS[ap]?.[stat] ?? 0;
      if (delta > bestApricorn) bestApricorn = delta;
    }

    out[stat] = berryPts + bestApricorn;
  }
  return out;
}

/**
 * Realistic *global* budget the user can distribute across the 5 stats at
 * once. NOT the sum of per-stat ceilings — a single 3-berry recipe
 * can't hit every stat at its maximum, it can only hit ONE.
 *
 * Algorithm: enumerate every (apricorn × multiset of ≤3 owned berries)
 * the same way the solver does, and return the combo whose sum of
 * non-negative stat points is highest. That's the best total number of
 * points a user can actually achieve in-game with those ingredients.
 *
 * Example: a single juice typically sits around 8–12 net points total,
 * not 30+ (which would be 6×5). Returning the true ceiling prevents the
 * UI from offering a budget the solver can never match.
 */
export function totalAchievableBudget(
  berries: BerrySeasoning[],
  apricorns: Apricorn[],
): number {
  if (apricorns.length === 0 || berries.length === 0) return 0;
  const pool = buildBerryPool(berries);
  let best = 0;
  for (const apricorn of apricorns) {
    for (const combo of multisetCombos(pool, MAX_SEASONINGS)) {
      const result = cookAprijuice({ apricorn, berries: combo });
      let sum = 0;
      for (const stat of RIDE_STATS) {
        const v = result.statBoosts[stat] ?? 0;
        if (v > 0) sum += v;
      }
      if (sum > best) best = sum;
    }
  }
  return best;
}

export function suggestAprijuice(
  berries: BerrySeasoning[],
  target: TargetBoosts,
  opts: { limit?: number; apricorns?: Apricorn[]; ignoredStats?: RidingStat[] } = {},
): Suggestion[] {
  const limit = opts.limit ?? 6;
  const apricorns = opts.apricorns ?? DEFAULT_APRICORNS;
  if (apricorns.length === 0) return [];

  const ignored = new Set(opts.ignoredStats ?? []);
  const pool = buildBerryPool(berries);

  const bySignature = new Map<string, Suggestion>();

  for (const apricorn of apricorns) {
    for (const combo of multisetCombos(pool, MAX_SEASONINGS)) {
      const result = cookAprijuice({ apricorn, berries: combo });
      const d = distance(target, result.statBoosts, ignored);
      const sig = `${apricorn}|${[...combo]
        .map((b) => b.slug)
        .sort()
        .join(",")}`;
      const prev = bySignature.get(sig);
      if (!prev || prev.distance > d) {
        bySignature.set(sig, {
          apricorn,
          berrySlugs: combo.map((b) => b.slug),
          result,
          distance: d,
        });
      }
    }
  }

  return [...bySignature.values()]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// Re-export for external typing convenience.
export type { TargetBoosts as TargetWeights };
