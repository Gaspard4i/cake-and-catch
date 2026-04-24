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

/**
 * Clamp a berry pool to the top K per-flavour. Bigger K = more combos
 * explored = better chance of finding a composite berry that hits two
 * flavours at once. 5 is a sweet spot: ≤25 berries × multiset-of-3 =
 * ~2925 combos × 7 apricorns ≈ 20k cook() calls, still <20 ms server-
 * side. Lower and we'd miss cross-flavour berries (Lansat, Liechi,
 * Ganlon etc. that boost ACCEL + SKILL together).
 */
function buildBerryPool(
  berries: BerrySeasoning[],
  perFlavour = 5,
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
 * Full enumeration of every achievable stat vector for an owned pool.
 *
 * For every (apricorn × multiset of ≤3 owned berries from the pruned
 * top-5-per-flavour pool) we cook the juice and store the resulting
 * stat vector. The UI uses this table to compute the REAL per-stat
 * ceiling given what's already allocated on the other stats (see
 * `maxForStatGiven`). That is the "ABR" the user asked for: a tree-like
 * index letting us answer "what's the biggest ACCEL reachable while
 * keeping SKILL ≥ 4 and SPEED ≥ 4?" in a single scan.
 *
 * Size: pool ≤ 25 berries → multisets of size ≤3 is ≈ 2 925 combos × 7
 * apricorns ≈ 20 500 vectors. Dedup by stringified key keeps the unique
 * set small (typically < 1 000). Works in a few ms on the server.
 */
export type StatVector = Record<RidingStat, number>;

export function achievableVectors(
  berries: BerrySeasoning[],
  apricorns: Apricorn[],
): StatVector[] {
  if (apricorns.length === 0 || berries.length === 0) return [];
  const pool = buildBerryPool(berries);
  const seen = new Map<string, StatVector>();
  for (const apricorn of apricorns) {
    for (const combo of multisetCombos(pool, MAX_SEASONINGS)) {
      const result = cookAprijuice({ apricorn, berries: combo });
      const v: StatVector = {
        ACCELERATION: result.statBoosts.ACCELERATION ?? 0,
        SKILL: result.statBoosts.SKILL ?? 0,
        SPEED: result.statBoosts.SPEED ?? 0,
        STAMINA: result.statBoosts.STAMINA ?? 0,
        JUMP: result.statBoosts.JUMP ?? 0,
      };
      const key = `${v.ACCELERATION}|${v.SKILL}|${v.SPEED}|${v.STAMINA}|${v.JUMP}`;
      if (!seen.has(key)) seen.set(key, v);
    }
  }
  return [...seen.values()];
}

/**
 * Per-stat ceiling — maximum achievable value for `stat` across ALL
 * reachable vectors. Independent of other stats; this is what a single
 * stat can hit if you dedicate the whole recipe to it. Useful as the
 * *initial* slider range before the user has allocated anything.
 */
export function achievableMaxPerStat(
  vectors: StatVector[],
): Record<RidingStat, number> {
  const out: Record<RidingStat, number> = {
    ACCELERATION: 0, SKILL: 0, SPEED: 0, STAMINA: 0, JUMP: 0,
  };
  for (const v of vectors) {
    for (const s of RIDE_STATS) {
      if (v[s] > out[s]) out[s] = v[s];
    }
  }
  return out;
}

/**
 * Constrained ceiling — "how high can `stat` go given that the other
 * stats must at least reach the values `constraints` has already
 * committed to?"
 *
 * This replaces the naive `budget - spentElsewhere` heuristic. Two stats
 * might EACH be individually reachable at 7 but share limited slots, so
 * pinning one at 7 forces the other below 7. This function gives the
 * honest answer by scanning the achievable set.
 *
 * @param stat        the stat we're querying
 * @param constraints lower bounds for EVERY stat (including stats the
 *                    user ignores — pass -Infinity for those so they
 *                    don't constrain the search)
 */
export function maxForStatGiven(
  vectors: StatVector[],
  stat: RidingStat,
  constraints: Record<RidingStat, number>,
): number {
  let best = -Infinity;
  outer: for (const v of vectors) {
    for (const other of RIDE_STATS) {
      if (other === stat) continue;
      if (v[other] < constraints[other]) continue outer;
    }
    if (v[stat] > best) best = v[stat];
  }
  return Number.isFinite(best) ? best : 0;
}

/**
 * Global budget across all requested stats. NOT the sum of
 * achievableMaxPerStat — a single 3-berry recipe can't hit each stat at
 * its ceiling. We scan the achievable set and return the maximum sum of
 * non-negative stats produced by any single recipe. Typical juices land
 * 8–12 pts total.
 */
export function totalAchievableBudget(vectors: StatVector[]): number {
  let best = 0;
  for (const v of vectors) {
    let sum = 0;
    for (const s of RIDE_STATS) if (v[s] > 0) sum += v[s];
    if (sum > best) best = sum;
  }
  return best;
}

/**
 * Composite score for tiebreaking. Two recipes with the same L2 distance
 * to the target aren't equivalent from a user perspective — the one that
 * packs MORE total useful points into the requested stats is better.
 *
 * Returned value: sum of min(actual, target) across the targeted (non-
 * ignored) stats. Higher is better.
 */
function usefulYield(
  target: TargetBoosts,
  actual: Partial<Record<RidingStat, number>>,
  ignored: Set<RidingStat>,
): number {
  let s = 0;
  for (const stat of RIDE_STATS) {
    if (ignored.has(stat)) continue;
    const t = target[stat] ?? 0;
    if (t <= 0) continue;
    const a = actual[stat] ?? 0;
    s += Math.max(0, Math.min(a, t));
  }
  return s;
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

  type Scored = Suggestion & { yield: number };
  const bySignature = new Map<string, Scored>();

  for (const apricorn of apricorns) {
    for (const combo of multisetCombos(pool, MAX_SEASONINGS)) {
      const result = cookAprijuice({ apricorn, berries: combo });
      const d = distance(target, result.statBoosts, ignored);
      const y = usefulYield(target, result.statBoosts, ignored);
      const sig = `${apricorn}|${[...combo]
        .map((b) => b.slug)
        .sort()
        .join(",")}`;
      const prev = bySignature.get(sig);
      if (
        !prev ||
        prev.distance > d ||
        (prev.distance === d && prev.yield < y)
      ) {
        bySignature.set(sig, {
          apricorn,
          berrySlugs: combo.map((b) => b.slug),
          result,
          distance: d,
          yield: y,
        });
      }
    }
  }

  return [...bySignature.values()]
    .sort((a, b) => {
      // Primary: closest to target (smaller L2 distance wins).
      if (a.distance !== b.distance) return a.distance - b.distance;
      // Tiebreak: higher useful yield wins (recipes that fill more of
      // the requested stats).
      return b.yield - a.yield;
    })
    .map(({ yield: _y, ...rest }) => rest)
    .slice(0, limit);
}

// Re-export for external typing convenience.
export type { TargetBoosts as TargetWeights };
