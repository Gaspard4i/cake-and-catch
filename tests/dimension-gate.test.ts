import { describe, it, expect } from "vitest";
import { spawnMatchesDimensions } from "@/lib/recommend/dimension-gate";

describe("spawnMatchesDimensions", () => {
  it("matches a Nether biome to the Nether dimension", () => {
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:nether/is_basalt"] },
        ["minecraft:the_nether"],
      ),
    ).toBe(true);
  });

  it("rejects an Overworld biome under the Nether", () => {
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:is_overworld"] },
        ["minecraft:the_nether"],
      ),
    ).toBe(false);
  });

  it("matches Overworld biome to overworld dimension", () => {
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:is_freshwater"] },
        ["minecraft:overworld"],
      ),
    ).toBe(true);
  });

  it("matches multiple biomes when any one fits the picked dimension", () => {
    expect(
      spawnMatchesDimensions(
        {
          biomes: [
            "#cobblemon:nether/is_basalt",
            "#cobblemon:is_freshwater",
          ],
        },
        ["minecraft:the_nether"],
      ),
    ).toBe(true);
  });

  it("keeps spawns whose every biome is unknown", () => {
    expect(
      spawnMatchesDimensions(
        { biomes: ["totally_unknown:made_up_biome"] },
        ["minecraft:the_nether"],
      ),
    ).toBe(true);
  });

  it("respects condition.dimensions when present (overrides biome lookup)", () => {
    expect(
      spawnMatchesDimensions(
        {
          biomes: ["#cobblemon:is_freshwater"],
          condition: { dimensions: ["minecraft:the_nether"] },
        },
        ["minecraft:the_nether"],
      ),
    ).toBe(true);
    expect(
      spawnMatchesDimensions(
        {
          biomes: ["#cobblemon:is_freshwater"],
          condition: { dimensions: ["minecraft:the_end"] },
        },
        ["minecraft:the_nether"],
      ),
    ).toBe(false);
  });

  it("returns true when no dimension is picked", () => {
    expect(spawnMatchesDimensions({ biomes: ["whatever"] }, [])).toBe(true);
  });

  it("treats `cobblemon:is_sky` as Overworld (Ducklett, Swanna leak)", () => {
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:is_sky"] },
        ["minecraft:the_nether"],
      ),
    ).toBe(false);
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:is_sky"] },
        ["minecraft:overworld"],
      ),
    ).toBe(true);
  });

  it("treats has_* tag-only spawns as Overworld", () => {
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:has_block/mud"] },
        ["minecraft:the_nether"],
      ),
    ).toBe(false);
    expect(
      spawnMatchesDimensions(
        { biomes: ["#cobblemon:has_block/mud"] },
        ["minecraft:overworld"],
      ),
    ).toBe(true);
  });

  it("ignores has_* tags when other dimensional tags are present", () => {
    expect(
      spawnMatchesDimensions(
        {
          biomes: [
            "#cobblemon:has_block/mud",
            "#cobblemon:nether/is_quartz",
          ],
        },
        ["minecraft:the_nether"],
      ),
    ).toBe(true);
  });

  it("matches every Nether biome variant", () => {
    const variants = [
      "#cobblemon:nether/is_basalt",
      "#cobblemon:nether/is_crimson",
      "#cobblemon:nether/is_warped",
      "#cobblemon:nether/is_soul_sand",
      "#cobblemon:nether/is_soul_fire",
      "#cobblemon:nether/is_quartz",
      "#cobblemon:nether/is_forest",
      "#cobblemon:nether/is_fungus",
      "#cobblemon:nether/is_mountain",
      "#cobblemon:nether/is_overgrowth",
      "#cobblemon:nether/is_desert",
      "#cobblemon:nether/is_frozen",
      "#cobblemon:nether/is_toxic",
      "#cobblemon:nether/is_wasteland",
    ];
    for (const v of variants) {
      expect(
        spawnMatchesDimensions({ biomes: [v] }, ["minecraft:the_nether"]),
      ).toBe(true);
    }
  });
});
