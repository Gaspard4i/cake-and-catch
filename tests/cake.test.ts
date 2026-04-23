import { describe, it, expect } from "vitest";
import {
  cakeDominantFlavour,
  filterSpawns,
  preferredFlavourFor,
  rankCakeForSpecies,
  TYPE_TO_FLAVOUR,
} from "@/lib/recommend/cake";
import type { Berry } from "@/lib/db/schema";

function berry(slug: string, flavours: Record<string, number>, colour = "red"): Berry {
  const dom =
    Object.entries(flavours).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    id: 0,
    slug,
    itemId: `cobblemon:${slug}`,
    flavours,
    dominantFlavour: dom,
    colour,
    weight: 1,
    raw: {},
  };
}

describe("preferredFlavourFor", () => {
  it("uses explicit preferredFlavours first", () => {
    expect(
      preferredFlavourFor({
        primaryType: "fire",
        secondaryType: null,
        preferredFlavours: ["SWEET"],
      }),
    ).toBe("SWEET");
  });
  it("falls back to primary type mapping", () => {
    expect(
      preferredFlavourFor({ primaryType: "fire", secondaryType: null, preferredFlavours: null }),
    ).toBe(TYPE_TO_FLAVOUR.fire);
  });
  it("falls back to secondary type if primary not mapped", () => {
    expect(
      preferredFlavourFor({
        primaryType: "unknown",
        secondaryType: "psychic",
        preferredFlavours: null,
      }),
    ).toBe("BITTER");
  });
  it("ultimate fallback is SWEET", () => {
    expect(
      preferredFlavourFor({
        primaryType: "unknown",
        secondaryType: null,
        preferredFlavours: null,
      }),
    ).toBe("SWEET");
  });
});

describe("rankCakeForSpecies", () => {
  const oran = berry("oran_berry", { SWEET: 5, SOUR: 5 }, "blue");
  const cheri = berry("cheri_berry", { SPICY: 10 }, "red");
  const pecha = berry("pecha_berry", { SWEET: 10 }, "pink");

  it("picks a flavour-matching berry first", () => {
    const species = {
      primaryType: "fire",
      secondaryType: null,
      preferredFlavours: null,
    };
    const top = rankCakeForSpecies(species, [oran, cheri, pecha], { limit: 1 });
    expect(top[0].berrySlug).toBe("cheri_berry");
    expect(top[0].reason).toBe("type_derived");
  });

  it("marks reason as preference_match when species has preferredFlavours", () => {
    const species = {
      primaryType: "fire",
      secondaryType: null,
      preferredFlavours: ["SWEET"],
    };
    const top = rankCakeForSpecies(species, [oran, cheri, pecha], { limit: 1 });
    expect(top[0].berrySlug).toBe("pecha_berry");
    expect(top[0].reason).toBe("preference_match");
  });
});

describe("cakeDominantFlavour", () => {
  it("sums flavours across seasoning slots", () => {
    const map = new Map([
      ["cheri_berry", berry("cheri_berry", { SPICY: 10 })],
      ["pecha_berry", berry("pecha_berry", { SWEET: 10 })],
    ]);
    expect(
      cakeDominantFlavour({ seasoningSlugs: ["cheri_berry", "cheri_berry"] }, map),
    ).toBe("SPICY");
    const tieResult = cakeDominantFlavour(
      { seasoningSlugs: ["cheri_berry", "pecha_berry"] },
      map,
    );
    // Tie: deterministic but either SPICY or SWEET is acceptable
    expect(["SPICY", "SWEET"]).toContain(tieResult);
  });
  it("returns null when empty", () => {
    expect(cakeDominantFlavour({ seasoningSlugs: [] }, new Map())).toBeNull();
  });
});

describe("filterSpawns", () => {
  const base = {
    biomes: ["#cobblemon:is_savanna"],
    condition: { minY: 60, maxY: 120, timeRange: "morning" } as Record<string, unknown>,
    levelMin: 5,
    levelMax: 50,
  };

  it("matches biome tag with or without leading # (union)", () => {
    expect(filterSpawns([base], { biomes: ["#cobblemon:is_savanna"] })).toHaveLength(1);
    expect(filterSpawns([base], { biomes: ["cobblemon:is_savanna"] })).toHaveLength(1);
    expect(filterSpawns([base], { biomes: ["minecraft:plains"] })).toHaveLength(0);
    // union: matches if ANY biome in the list matches
    expect(
      filterSpawns([base], { biomes: ["minecraft:plains", "cobblemon:is_savanna"] }),
    ).toHaveLength(1);
  });
  it("respects Y bounds", () => {
    expect(filterSpawns([base], { maxY: 50 })).toHaveLength(0);
    expect(filterSpawns([base], { minY: 80 })).toHaveLength(1);
    expect(filterSpawns([base], { minY: 200 })).toHaveLength(0);
  });
  it("matches timeRanges (union)", () => {
    expect(filterSpawns([base], { timeRanges: ["morning"] })).toHaveLength(1);
    expect(filterSpawns([base], { timeRanges: ["night"] })).toHaveLength(0);
    expect(filterSpawns([base], { timeRanges: ["night", "morning"] })).toHaveLength(1);
  });
  it("keeps spawns with timeRange=any even when time filter is set", () => {
    const anyTime = { ...base, condition: { ...base.condition, timeRange: "any" } };
    expect(filterSpawns([anyTime], { timeRanges: ["night"] })).toHaveLength(1);
  });
});
