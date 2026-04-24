/**
 * Reverse aprijuice solver. Given one or more target RidingStats the user
 * wants to boost, enumerate promising apricorn + berry combinations and rank
 * them by how well they push those stats.
 *
 * The forward cook() function is deterministic and cheap (<1ms), so we just
 * try every apricorn × small berry selection and keep the top N.
 *
 * Berry selection is capped at MAX_SEASONINGS (3 — Cobblemon campfire pot
 * hard cap). We do NOT brute-force every 3-combination over ~70 berries
 * (~55k combos) because many are equivalent in flavour contribution. Instead:
 *   - For each target flavour (derived from target stats), pick the top 3
 *     berries whose dominant flavour matches. This yields a pool of ≤ 15
 *     "useful" berries; combinations over that pool are cheap.
 *   - Multiple copies of the same berry slug are allowed (Cobblemon accepts
 *     duplicate seasonings as long as slots are distinct).
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

const APRICORNS: Apricorn[] = [
  "RED",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PINK",
  "BLACK",
  "WHITE",
];
const MAX_SEASONINGS = 3;

export type TargetWeights = Partial<Record<RidingStat, number>>;

export type Suggestion = {
  apricorn: Apricorn;
  berrySlugs: string[];
  result: JuiceResult;
  score: number;
};

/** Stats reverse-map from flavour: for a desired stat, which flavour to chase. */
const STAT_TO_FLAVOUR: Record<RidingStat, Flavour> = Object.fromEntries(
  (Object.entries(FLAVOUR_TO_STAT) as Array<[Flavour, RidingStat]>).map(
    ([f, s]) => [s, f],
  ),
) as Record<RidingStat, Flavour>;

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
 * Generate all multiset combinations of size ≤ maxSize from a pool. A multiset
 * because Cobblemon lets you stack the same seasoning slug across distinct
 * slots. Returns the empty selection too.
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

function scoreResult(result: JuiceResult, weights: TargetWeights): number {
  let s = 0;
  for (const [stat, w] of Object.entries(weights) as Array<
    [RidingStat, number]
  >) {
    const got = result.statBoosts[stat] ?? 0;
    s += got * w;
  }
  // Tiny penalty for net-negative stats the user didn't ask for; keeps
  // WHITE apricorn (−2 everywhere) from winning with a lucky alignment.
  for (const [stat, delta] of Object.entries(result.statBoosts) as Array<
    [RidingStat, number]
  >) {
    if (delta < 0 && !(stat in weights)) s += delta * 0.25;
  }
  return s;
}

/**
 * Build the candidate berry pool. For every target flavour we keep the top
 * berries by that flavour's magnitude. A shared cross-flavour pool is
 * returned so the solver can still pick a high-flavour berry even if the
 * user has multiple target stats.
 */
function buildBerryPool(
  berries: BerrySeasoning[],
  targetFlavours: Set<Flavour>,
  perFlavour = 4,
): BerrySeasoning[] {
  const picks = new Map<string, BerrySeasoning>();
  for (const f of targetFlavours) {
    const ranked = berries
      .filter((b) => (b.flavours[f] ?? 0) > 0)
      .sort((a, c) => (c.flavours[f] ?? 0) - (a.flavours[f] ?? 0))
      .slice(0, perFlavour);
    for (const b of ranked) picks.set(b.slug, b);
  }
  // Always include a "neutral" high-flavour berry from each flavour as filler,
  // but only if the user hasn't targeted anything (edge case).
  if (targetFlavours.size === 0) {
    for (const f of Object.keys(FLAVOUR_TO_STAT) as Flavour[]) {
      const top = berries
        .filter((b) => dominantFlavour(b) === f)
        .sort((a, c) => (c.flavours[f] ?? 0) - (a.flavours[f] ?? 0))[0];
      if (top) picks.set(top.slug, top);
    }
  }
  return [...picks.values()];
}

export function suggestAprijuice(
  berries: BerrySeasoning[],
  weights: TargetWeights,
  opts: { limit?: number } = {},
): Suggestion[] {
  const limit = opts.limit ?? 6;
  const targetFlavours = new Set<Flavour>();
  for (const stat of Object.keys(weights) as RidingStat[]) {
    const f = STAT_TO_FLAVOUR[stat];
    if (f) targetFlavours.add(f);
  }
  const pool = buildBerryPool(berries, targetFlavours);

  const bySignature = new Map<string, Suggestion>();

  for (const apricorn of APRICORNS) {
    for (const combo of multisetCombos(pool, MAX_SEASONINGS)) {
      const result = cookAprijuice({ apricorn, berries: combo });
      const score = scoreResult(result, weights);
      if (score <= 0) continue;
      const sig = `${apricorn}|${[...combo]
        .map((b) => b.slug)
        .sort()
        .join(",")}`;
      const prev = bySignature.get(sig);
      if (!prev || prev.score < score) {
        bySignature.set(sig, {
          apricorn,
          berrySlugs: combo.map((b) => b.slug),
          result,
          score,
        });
      }
    }
  }

  return [...bySignature.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
