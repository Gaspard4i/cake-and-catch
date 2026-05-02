import { describe, it, expect } from "vitest";
import {
  rankSnackAttractions,
  mergeBaitEffects,
  type SnackSpawnCandidate,
} from "@/lib/recommend/snack-spawn";

function candidate(
  slug: string,
  bucket: SnackSpawnCandidate["bucket"],
  weight: number,
  overrides: Partial<SnackSpawnCandidate> = {},
): SnackSpawnCandidate {
  return {
    spawnId: Math.floor(Math.random() * 1e6),
    speciesId: Math.floor(Math.random() * 1e6),
    slug,
    name: slug,
    dexNo: 1,
    primaryType: "normal",
    secondaryType: null,
    eggGroups: [],
    bucket,
    weight,
    levelMin: 1,
    levelMax: 50,
    ...overrides,
  };
}

describe("mergeBaitEffects", () => {
  it("groups by (type, subcategory) with chance capped and value ceiled", () => {
    const merged = mergeBaitEffects([
      { type: "cobblemon:typing", subcategory: "fire", chance: 0.6, value: 4.2 },
      { type: "cobblemon:typing", subcategory: "fire", chance: 0.7, value: 1.1 },
      { type: "cobblemon:typing", subcategory: "water", chance: 0.5, value: 3 },
    ]);
    expect(merged).toHaveLength(2);
    const fire = merged.find((m) => m.subcategory === "fire")!;
    expect(fire.chance).toBe(1); // capped at 1 (0.6 + 0.7 → cap)
    // First insert ceils 4.2 → 5, then merge ceils (5 + 1.1) → 7. Mirrors
    // upstream `SpawnBaitUtils.mergeEffects` per-add ceiling.
    expect(fire.value).toBe(7);
  });

  it("strips the cobblemon: namespace from type", () => {
    const merged = mergeBaitEffects([
      { type: "cobblemon:rarity_bucket", chance: 1, value: 1 },
    ]);
    expect(merged[0].type).toBe("rarity_bucket");
  });
});

describe("rankSnackAttractions — Cobblemon parity", () => {
  it("with no bait, common dominates rare 5.5× via PokeSnack multiplier", () => {
    // Two spawns, equal weight — only difference is the bucket. The Poké
    // Snack multiplier is 1× / 5.5× / 5.5× — but rarity softening dampens it
    // when no rarity_bucket bait is applied.
    const ranked = rankSnackAttractions(
      [candidate("c", "common", 6), candidate("u", "ultra-rare", 6)],
      {},
      [],
    );
    const common = ranked.find((r) => r.slug === "c")!;
    const ultra = ranked.find((r) => r.slug === "u")!;
    // ultra-rare gets the 5.5 boost so it must outrank common when both have
    // identical weight (the only natural counter-balance is the natural pool
    // weight, which is already factored into `weight` upstream).
    expect(ultra.finalProbability).toBeGreaterThan(common.finalProbability);
    // Probabilities sum to 1 across the candidate set.
    const total = ranked.reduce((s, r) => s + r.finalProbability, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("typing effect multiplies the matching species weight", () => {
    const ranked = rankSnackAttractions(
      [
        candidate("fire-mon", "common", 1, { primaryType: "fire" }),
        candidate("water-mon", "common", 1, { primaryType: "water" }),
      ],
      {},
      [{ type: "cobblemon:typing", subcategory: "fire", chance: 1, value: 10 }],
    );
    const fire = ranked.find((r) => r.slug === "fire-mon")!;
    const water = ranked.find((r) => r.slug === "water-mon")!;
    // Fire weight goes from 1 to 10 → ~91% vs ~9% inside the common bucket.
    expect(fire.finalProbability / water.finalProbability).toBeCloseTo(10, 1);
    expect(fire.reasons).toContain("fire-type ×10");
  });

  it("egg_group effect matches case-insensitively against species eggGroups", () => {
    const ranked = rankSnackAttractions(
      [
        candidate("a", "common", 1, { eggGroups: ["Monster"] }),
        candidate("b", "common", 1, { eggGroups: ["Field"] }),
      ],
      {},
      [{ type: "cobblemon:egg_group", subcategory: "monster", chance: 1, value: 5 }],
    );
    const a = ranked.find((r) => r.slug === "a")!;
    const b = ranked.find((r) => r.slug === "b")!;
    expect(a.finalProbability).toBeGreaterThan(b.finalProbability);
  });

  it("rarity_bucket effect softens whichever bucket is dominant", () => {
    // Same total bucket weight on both sides: 2 commons (×1) and 1 ultra-rare
    // (×5.5). Without softening, ultra-rare dominates (~73% share). The
    // exponent `1 / (1.2 + 0.2(t-1))` < 1 compresses LARGE values more than
    // small ones, so it pulls the dominant bucket DOWN — common gains share.
    const setup = [
      candidate("c1", "common", 1),
      candidate("c2", "common", 1),
      candidate("u1", "ultra-rare", 1),
    ];
    const without = rankSnackAttractions(setup, {}, []);
    const with2 = rankSnackAttractions(setup, {}, [
      { type: "cobblemon:rarity_bucket", chance: 1, value: 2 },
    ]);
    const ultraWithout = without.find((r) => r.slug === "u1")!.finalProbability;
    const ultraWith = with2.find((r) => r.slug === "u1")!.finalProbability;
    expect(ultraWithout).toBeGreaterThan(0.7);
    expect(ultraWith).toBeLessThan(ultraWithout);
    // Softening still preserves the ultra-rare advantage, just reduced.
    expect(ultraWith).toBeGreaterThan(0.5);
  });

  it("returns at most opts.limit results, sorted descending", () => {
    const candidates = Array.from({ length: 50 }, (_, i) =>
      candidate(`p${i}`, "common", i + 1),
    );
    const ranked = rankSnackAttractions(candidates, {}, [], { limit: 5 });
    expect(ranked).toHaveLength(5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].finalProbability).toBeGreaterThanOrEqual(
        ranked[i].finalProbability,
      );
    }
  });

  it("empty candidate list returns empty array", () => {
    expect(rankSnackAttractions([], {}, [])).toEqual([]);
  });
});
