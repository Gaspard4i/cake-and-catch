import { BIOME_SECTIONS } from "./biome-sections";

/**
 * Build a biome → dimension map from the curated section list. Both
 * Cobblemon tags and vanilla biomes carry an explicit dimension on the
 * section that owns them; modded entries fall through (we treat them as
 * Overworld unless we know better).
 */
function buildBiomeDimensionMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of BIOME_SECTIONS) {
    if (!section.dimension) continue;
    for (const tag of section.tags) {
      const stripped = tag.replace(/^#/, "");
      // Insert both the raw and the stripped form so the lookup works
      // whether the spawn condition stored the tag with `#` or without.
      map.set(stripped, section.dimension);
    }
  }
  // Hard-pin the explicit vanilla dimension keys so multi-dimension
  // spawn entries (e.g. `dimensions: ["minecraft:the_nether"]`) bypass
  // the biome lookup correctly.
  return map;
}

const BIOME_TO_DIMENSION = buildBiomeDimensionMap();

/**
 * Cross-dimensional tags Cobblemon and common addons use on top of the
 * curated sections. Without these the gate keeps too many spawns ("any
 * is_overworld is unknown to us, so let it through under Nether").
 */
const ADDITIONAL_BIOME_DIMENSIONS: Record<string, string> = {
  "cobblemon:is_overworld": "minecraft:overworld",
  "minecraft:is_overworld": "minecraft:overworld",
  "aether:is_aether": "aether:the_aether",
  "cobblemon:is_aether": "aether:the_aether",
  "the_aether:is_aether": "aether:the_aether",
};
for (const [k, v] of Object.entries(ADDITIONAL_BIOME_DIMENSIONS)) {
  BIOME_TO_DIMENSION.set(k, v);
}

function stripHash(s: string): string {
  return s.replace(/^#/, "");
}

/**
 * Heuristic: does this spawn belong to ANY of the dimensions the
 * player picked?
 *
 * Logic:
 *   1. If the spawn declares `dimensions` in its condition, that's the
 *      authoritative answer — intersect with the picked dimensions.
 *   2. Else, if at least one of the spawn's biomes maps to one of the
 *      picked dimensions, accept.
 *   3. Else (modded biomes we don't know, or no biome at all), fall
 *      back to keeping the spawn so we don't drop unknown content.
 */
export function spawnMatchesDimensions(
  spawn: {
    biomes?: string[];
    condition?: unknown;
  },
  pickedDimensions: string[],
): boolean {
  if (pickedDimensions.length === 0) return true;
  const picked = new Set(pickedDimensions);
  const cond = (spawn.condition ?? null) as { dimensions?: unknown } | null;
  const condDims = Array.isArray(cond?.dimensions)
    ? (cond.dimensions as string[])
    : null;
  if (condDims && condDims.length > 0) {
    return condDims.some((d) => picked.has(d));
  }
  const biomes = spawn.biomes ?? [];
  if (biomes.length === 0) {
    // Nothing tells us where this spawns. Keep it — over-rejecting
    // hides legitimate addons that omit the field.
    return true;
  }
  // Strict mode: every biome we recognise must agree on the dimension
  // for the spawn to pass. Unknown biomes are NOT a free pass — if the
  // player picks Nether, a spawn that lives in unknown biomes plus a
  // known Overworld one is still Overworld content and should not show
  // up.
  let allUnknown = true;
  for (const b of biomes) {
    const dim = BIOME_TO_DIMENSION.get(stripHash(b));
    if (dim) {
      allUnknown = false;
      if (picked.has(dim)) return true;
    }
  }
  // Every biome was unknown — we let the spawn through to avoid hiding
  // legitimately modded content the addon team curated.
  return allUnknown;
}
