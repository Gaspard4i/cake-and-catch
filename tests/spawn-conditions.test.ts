import { describe, it, expect } from "vitest";
import { filterSpawns } from "@/lib/recommend/snack";
import {
  applyPresets,
  mergeCondition,
  type PresetFile,
  type SpawnEntry,
} from "@/lib/parsers/spawn";

type SpawnRow = Parameters<typeof filterSpawns>[0][number];

function spawn(overrides: Partial<SpawnRow> = {}): SpawnRow {
  return {
    biomes: [],
    condition: null,
    anticondition: null,
    levelMin: 1,
    levelMax: 50,
    sourceName: "cobblemon",
    context: "grounded",
    ...overrides,
  } as SpawnRow;
}

describe("filterSpawns — anticondition", () => {
  it("rejects a spawn whose anticondition matches the player context", () => {
    const spawns = [
      spawn({
        biomes: ["minecraft:plains"],
        anticondition: { biomes: ["minecraft:plains"] },
      }),
    ];
    const out = filterSpawns(spawns, { biomes: ["minecraft:plains"] });
    expect(out).toHaveLength(0);
  });

  it("keeps a spawn whose anticondition does NOT match", () => {
    const spawns = [
      spawn({
        biomes: ["minecraft:plains"],
        anticondition: { biomes: ["minecraft:desert"] },
      }),
    ];
    const out = filterSpawns(spawns, { biomes: ["minecraft:plains"] });
    expect(out).toHaveLength(1);
  });

  it("strips '#' tag prefix when comparing biomes", () => {
    const spawns = [
      spawn({
        biomes: ["#cobblemon:is_lush"],
        condition: { biomes: ["#cobblemon:is_lush"] },
      }),
    ];
    const out = filterSpawns(spawns, { biomes: ["cobblemon:is_lush"] });
    expect(out).toHaveLength(1);
  });
});

describe("filterSpawns — extended conditions", () => {
  it("filters by light level (block-light)", () => {
    const spawns = [
      spawn({
        biomes: ["minecraft:plains"],
        condition: { biomes: ["minecraft:plains"], maxLight: 7 },
      }),
    ];
    expect(
      filterSpawns(spawns, { biomes: ["minecraft:plains"], lightLevel: 4 }),
    ).toHaveLength(1);
    expect(
      filterSpawns(spawns, { biomes: ["minecraft:plains"], lightLevel: 12 }),
    ).toHaveLength(0);
  });

  it("filters by canSeeSky", () => {
    const spawns = [
      spawn({
        biomes: ["minecraft:plains"],
        condition: { biomes: ["minecraft:plains"], canSeeSky: true },
      }),
    ];
    expect(
      filterSpawns(spawns, { biomes: ["minecraft:plains"], canSeeSky: true }),
    ).toHaveLength(1);
    expect(
      filterSpawns(spawns, { biomes: ["minecraft:plains"], canSeeSky: false }),
    ).toHaveLength(0);
  });

  it("filters by structures", () => {
    const spawns = [
      spawn({
        biomes: ["minecraft:plains"],
        condition: {
          biomes: ["minecraft:plains"],
          structures: ["minecraft:village"],
        },
      }),
    ];
    expect(
      filterSpawns(spawns, {
        biomes: ["minecraft:plains"],
        structures: ["minecraft:village"],
      }),
    ).toHaveLength(1);
    expect(
      filterSpawns(spawns, { biomes: ["minecraft:plains"] }),
    ).toHaveLength(0);
  });
});

describe("mergeCondition — preset merge semantics", () => {
  it("returns local when preset is undefined", () => {
    expect(mergeCondition(undefined, { biomes: ["a"] })).toEqual({ biomes: ["a"] });
  });

  it("returns preset when local is undefined", () => {
    expect(mergeCondition({ biomes: ["a"] }, undefined)).toEqual({ biomes: ["a"] });
  });

  it("local scalar overrides preset scalar", () => {
    const merged = mergeCondition(
      { canSeeSky: true, minLight: 5 },
      { canSeeSky: false },
    );
    expect(merged?.canSeeSky).toBe(false);
    expect(merged?.minLight).toBe(5);
  });

  it("array fields are unioned and deduped", () => {
    const merged = mergeCondition(
      { biomes: ["a", "b"] },
      { biomes: ["b", "c"] },
    );
    expect(new Set(merged?.biomes)).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("applyPresets", () => {
  const presets = new Map<string, PresetFile>([
    [
      "natural",
      {
        condition: { neededBaseBlocks: ["#cobblemon:natural"] },
        anticondition: { neededBaseBlocks: ["minecraft:farmland"] },
      },
    ],
  ]);

  it("merges referenced presets into the spawn entry", () => {
    const entry: SpawnEntry = {
      id: "test",
      pokemon: "test",
      type: "pokemon",
      presets: ["natural"],
      bucket: "common",
      level: "1-5",
      weight: 1,
      condition: { biomes: ["minecraft:plains"] },
    };
    const result = applyPresets(entry, presets);
    expect(result.condition?.biomes).toEqual(["minecraft:plains"]);
    expect(result.condition?.neededBaseBlocks).toEqual(["#cobblemon:natural"]);
    expect(result.anticondition?.neededBaseBlocks).toEqual(["minecraft:farmland"]);
  });

  it("is a no-op when no presets referenced", () => {
    const entry: SpawnEntry = {
      id: "test",
      pokemon: "test",
      type: "pokemon",
      presets: [],
      bucket: "common",
      level: "1-5",
      weight: 1,
      condition: { biomes: ["minecraft:plains"] },
    };
    const result = applyPresets(entry, presets);
    expect(result).toEqual(entry);
  });

  it("ignores unknown preset names without crashing", () => {
    const entry: SpawnEntry = {
      id: "test",
      pokemon: "test",
      type: "pokemon",
      presets: ["does_not_exist"],
      bucket: "common",
      level: "1-5",
      weight: 1,
    };
    expect(() => applyPresets(entry, presets)).not.toThrow();
  });
});
