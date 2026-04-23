import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { speciesSchema } from "@/lib/parsers/species";
import { spawnFileSchema, parseLevelRange } from "@/lib/parsers/spawn";

const fixtures = join(process.cwd(), "tests", "fixtures");

async function loadJson(name: string) {
  return JSON.parse(await readFile(join(fixtures, name), "utf-8"));
}

describe("speciesSchema", () => {
  it("parses a real Bulbasaur species file", async () => {
    const raw = await loadJson("bulbasaur_species.json");
    const parsed = speciesSchema.parse(raw);
    expect(parsed.name).toBe("Bulbasaur");
    expect(parsed.nationalPokedexNumber).toBe(1);
    expect(parsed.primaryType).toBe("grass");
    expect(parsed.secondaryType).toBe("poison");
    expect(parsed.catchRate).toBe(45);
    expect(parsed.baseStats.hp).toBe(45);
    expect(parsed.abilities).toContain("overgrow");
  });
});

describe("spawnFileSchema", () => {
  it("parses a real Bulbasaur spawn pool file", async () => {
    const raw = await loadJson("bulbasaur_spawn.json");
    const parsed = spawnFileSchema.parse(raw);
    expect(parsed.enabled).toBe(true);
    expect(parsed.spawns).toHaveLength(1);
    const entry = parsed.spawns[0];
    expect(entry.id).toBe("bulbasaur-1");
    expect(entry.bucket).toBe("ultra-rare");
    expect(entry.condition?.biomes).toContain("#cobblemon:is_jungle");
  });
});

describe("parseLevelRange", () => {
  it("parses '5-32'", () => {
    expect(parseLevelRange("5-32")).toEqual({ min: 5, max: 32 });
  });
  it("parses single value '10'", () => {
    expect(parseLevelRange("10")).toEqual({ min: 10, max: 10 });
  });
  it("throws on invalid input", () => {
    expect(() => parseLevelRange("abc")).toThrow();
  });
});
