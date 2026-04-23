import type { Berry, Species, Spawn } from "@/lib/db/schema";
import type { Flavour } from "@/lib/parsers/seasoning";
import { dominantFlavour, FLAVOURS } from "@/lib/parsers/seasoning";

/**
 * Convention Pokémon classique pour mapper un type vers une saveur préférée.
 * Cobblemon ne stocke pas `preferredFlavours` dans les species JSON (vérifié sur 1025
 * espèces), donc on dérive de type → flavour. Affiché avec badge `derived` côté UI.
 */
export const TYPE_TO_FLAVOUR: Record<string, Flavour> = {
  fire: "SPICY",
  fighting: "SPICY",
  ground: "SPICY",
  water: "DRY",
  ice: "DRY",
  flying: "DRY",
  grass: "SWEET",
  bug: "SWEET",
  fairy: "SWEET",
  psychic: "BITTER",
  ghost: "BITTER",
  dark: "BITTER",
  rock: "SOUR",
  steel: "SOUR",
  electric: "SOUR",
  poison: "SOUR",
  dragon: "SPICY",
  normal: "SWEET",
};

export function preferredFlavourFor(species: Pick<Species, "primaryType" | "secondaryType" | "preferredFlavours">): Flavour {
  if (species.preferredFlavours && species.preferredFlavours.length > 0) {
    const f = species.preferredFlavours[0].toUpperCase();
    if ((FLAVOURS as readonly string[]).includes(f)) return f as Flavour;
  }
  return (
    TYPE_TO_FLAVOUR[species.primaryType] ??
    (species.secondaryType ? TYPE_TO_FLAVOUR[species.secondaryType] : undefined) ??
    "SWEET"
  );
}

export type CakeRecommendation = {
  berrySlug: string;
  berryItemId: string;
  dominantFlavour: Flavour;
  score: number;
  reason: "preference_match" | "type_derived" | "fallback";
  colour: string | null;
};

/**
 * Given a species and the list of available berries, pick the best seasoning(s)
 * to bake a Poké Cake tuned for it. Pure, deterministic, testable.
 */
export function rankCakeForSpecies(
  species: Pick<Species, "primaryType" | "secondaryType" | "preferredFlavours">,
  berries: Berry[],
  opts: { limit?: number } = {},
): CakeRecommendation[] {
  const target = preferredFlavourFor(species);
  const out: CakeRecommendation[] = [];
  for (const b of berries) {
    const dom = (b.dominantFlavour as Flavour | null) ?? dominantFlavour(b.flavours);
    if (!dom) continue;
    const intensity = (b.flavours as Record<string, number>)[dom] ?? 0;
    let score = 0;
    let reason: CakeRecommendation["reason"] = "fallback";
    if (dom === target) {
      score = 100 + intensity;
      reason =
        species.preferredFlavours && species.preferredFlavours.length > 0
          ? "preference_match"
          : "type_derived";
    } else {
      score = intensity * 0.1;
    }
    out.push({
      berrySlug: b.slug,
      berryItemId: b.itemId,
      dominantFlavour: dom,
      score,
      reason,
      colour: b.colour,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, opts.limit ?? 3);
}

/**
 * INVERSE: given a cake composition (set of berry slugs in the seasoning slot)
 * and optional spawn filters, return the list of species that would be "attracted"
 * (can spawn in the biome/conditions AND whose preferred flavour matches the cake's
 * dominant flavour).
 */
export type CakeComposition = {
  seasoningSlugs: string[]; // berry slugs dropped in the S1 slot
};

export type SpawnFilter = {
  biome?: string; // e.g. '#cobblemon:is_savanna'
  minY?: number;
  maxY?: number;
  timeRange?: string; // 'day' | 'night' | 'morning' | ...
  weather?: "clear" | "rain" | "thunder";
};

export type AttractedSpecies = {
  speciesId: number;
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
  matchedFlavour: Flavour;
  spawns: number;
  reasons: string[];
};

export function cakeDominantFlavour(
  composition: CakeComposition,
  berriesBySlug: Map<string, Berry>,
): Flavour | null {
  const agg: Record<string, number> = {};
  for (const slug of composition.seasoningSlugs) {
    const b = berriesBySlug.get(slug);
    if (!b) continue;
    for (const [k, v] of Object.entries(b.flavours as Record<string, number>)) {
      agg[k] = (agg[k] ?? 0) + v;
    }
  }
  return dominantFlavour(agg);
}

/**
 * Filter a pool of spawns against a filter. `spawns` is a lightweight DTO joining
 * spawn + species so the caller can pre-load once.
 */
export function filterSpawns<
  T extends Pick<Spawn, "biomes" | "condition"> & { levelMin: number; levelMax: number },
>(spawns: T[], filter: SpawnFilter): T[] {
  return spawns.filter((s) => {
    if (filter.biome) {
      const match = s.biomes.some(
        (b) =>
          b === filter.biome ||
          b.replace(/^#/, "") === filter.biome!.replace(/^#/, ""),
      );
      if (!match) return false;
    }
    const cond = (s.condition ?? {}) as Record<string, unknown>;
    if (typeof filter.minY === "number") {
      if (typeof cond.maxY === "number" && cond.maxY < filter.minY) return false;
    }
    if (typeof filter.maxY === "number") {
      if (typeof cond.minY === "number" && cond.minY > filter.maxY) return false;
    }
    if (filter.timeRange && typeof cond.timeRange === "string") {
      if (cond.timeRange !== filter.timeRange && cond.timeRange !== "any") return false;
    }
    if (filter.weather) {
      if (filter.weather === "rain" && cond.isRaining === false) return false;
      if (filter.weather === "clear" && (cond.isRaining === true || cond.isThundering === true))
        return false;
      if (filter.weather === "thunder" && cond.isThundering === false) return false;
    }
    return true;
  });
}
