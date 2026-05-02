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
  // Cobblemon's `is_sky` tag covers airborne biomes (Aether, etc.)
  // but is also matched by Overworld biomes that "can see the sky".
  // Treat it as Overworld so the dimension gate doesn't leak Ducklett /
  // Swanna into Nether/End picks.
  "cobblemon:is_sky": "minecraft:overworld",
  "cobblemon:is_magical": "minecraft:overworld",
  "aether:is_aether": "aether:the_aether",
  "cobblemon:is_aether": "aether:the_aether",
  "the_aether:is_aether": "aether:the_aether",
  // Bumblezone & BoP sub-biomes are Overworld unless the addon ships a
  // dedicated dimension we know about.
  "the_bumblezone:crystal_canyon": "minecraft:overworld",
  "biomesoplenty:crystalline_chasm": "minecraft:overworld",
};

/**
 * Tag prefixes that mean "any biome that has X" — they don't pin a
 * dimension by themselves. Cobblemon ships dozens (`has_block/mud`,
 * `has_feature/coral_reef`, `has_ore/diamond`, …). When a spawn ONLY
 * lists tags from this set, we can't tell its dimension and we keep
 * the spawn for safety. When it lists at least one dimensional biome
 * AND some has_* tag, the dimensional biome decides.
 */
const HAS_TAG_PREFIXES = [
  "cobblemon:has_block/",
  "cobblemon:has_feature/",
  "cobblemon:has_ore/",
  "cobblemon:has_density/",
  "cobblemon:has_season/",
  "cobblemon:has_structure/",
  "cobblemon:evolution/",
];

function isHasTag(b: string): boolean {
  const stripped = b.replace(/^#/, "");
  return HAS_TAG_PREFIXES.some((p) => stripped.startsWith(p));
}
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
  // Strict mode: every biome we recognise must agree on the dimension.
  // `has_*` and `evolution/` tags don't pin a dimension and are
  // skipped. Truly unknown biomes (modded namespaces we haven't
  // catalogued) keep the spawn — that's the only fallback.
  let allUnknownOrHasTag = true;
  let hasOnlyHasTags = true;
  for (const b of biomes) {
    if (isHasTag(b)) continue;
    hasOnlyHasTags = false;
    const dim = BIOME_TO_DIMENSION.get(stripHash(b));
    if (dim) {
      allUnknownOrHasTag = false;
      if (picked.has(dim)) return true;
    }
  }
  // Spawn lists only `has_*` tags — these cross-cutting tags don't
  // pin a dimension. We treat the spawn as Overworld by default
  // because every vanilla `has_block` / `has_feature` resource lives
  // there; a modded spawn that genuinely needs Nether mud would set
  // `condition.dimensions` (handled at the top of this function).
  if (hasOnlyHasTags) return picked.has("minecraft:overworld");
  return allUnknownOrHasTag;
}
