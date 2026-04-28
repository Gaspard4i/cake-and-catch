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
  /** If provided, spawn must match AT LEAST ONE biome (union). */
  biomes?: string[];
  minY?: number;
  maxY?: number;
  /** If provided, spawn must match AT LEAST ONE timeRange (union). */
  timeRanges?: string[];
  weather?: "clear" | "rain" | "thunder";
  /** Restrict spawns to those whose `sourceName` matches one of these
   *  values (cobblemon, mysticmons, …). Empty/undefined = no filter. */
  sources?: string[];
  /** Restrict to spawns whose Cobblemon spawn `context` is one of these
   *  (grounded, submerged, surface, seafloor, sky_air). Used by the bait
   *  maker to surface only water spawns. Empty/undefined = no filter. */
  contexts?: string[];
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
 * Human-friendly descriptions of the effect tags berries carry, per the
 * upstream tag files in `data/cobblemon/tags/item/berries/*.json`. The
 * PokeCake itself does not apply any battle effect — the berries just
 * decorate and influence the cake's colour (food_colour processor) and are
 * recorded as "ingredients" for tooltip display. Effects below come into play
 * when the berry is held / eaten by a Pokémon in battle or outside.
 */
export const EFFECT_TAG_LABELS: Record<
  string,
  { title: string; description: string; tone: "healing" | "friendship" | "defense" | "buff" | "offense" | "utility" }
> = {
  hp_recovery: {
    title: "HP recovery",
    description: "Restores HP when held and HP drops low.",
    tone: "healing",
  },
  status_recovery: {
    title: "Status cure",
    description: "Cures a specific (or any) status condition when held.",
    tone: "healing",
  },
  pp_recovery: {
    title: "PP recovery",
    description: "Restores PP of a move whose PP reached 0.",
    tone: "healing",
  },
  nature_recovery: {
    title: "Confuse-heal",
    description: "Restores HP but may confuse Pokémon that dislike its flavour.",
    tone: "healing",
  },
  friendship: {
    title: "Friendship ↑",
    description: "Boosts friendship even though it lowers one EV. Cake use keeps the friendship boost intact.",
    tone: "friendship",
  },
  damage_reduction: {
    title: "Type resist",
    description: "Halves a super-effective hit of a specific type once.",
    tone: "defense",
  },
  stat_buff: {
    title: "Stat buff",
    description: "Sharply raises a stat in a pinch (low HP or crit).",
    tone: "buff",
  },
  damaging: {
    title: "Counter-damage",
    description: "Damages the attacker when held Pokémon is hit (physical/special).",
    tone: "offense",
  },
  non_battle: {
    title: "Out-of-battle",
    description: "Has no battle effect but is used for crafting, friendship, or EV lowering.",
    tone: "utility",
  },
};

/** Aggregate effect tags across berries placed in the cake, deduplicated. */
export function cakeEffectTags(
  composition: CakeComposition,
  berriesBySlug: Map<string, Berry>,
): string[] {
  const set = new Set<string>();
  for (const slug of composition.seasoningSlugs) {
    const b = berriesBySlug.get(slug);
    if (!b) continue;
    for (const tag of b.effectTags ?? []) set.add(tag);
  }
  return [...set];
}

/**
 * Filter a pool of spawns against a filter. `spawns` is a lightweight DTO joining
 * spawn + species so the caller can pre-load once.
 */
function stripHash(s: string): string {
  return s.replace(/^#/, "");
}

export function filterSpawns<
  T extends Pick<Spawn, "biomes" | "condition"> & {
    levelMin: number;
    levelMax: number;
    sourceName?: string;
    context?: string | null;
  },
>(spawns: T[], filter: SpawnFilter): T[] {
  const biomeSet =
    filter.biomes && filter.biomes.length > 0
      ? new Set(filter.biomes.map(stripHash))
      : null;
  const timeSet =
    filter.timeRanges && filter.timeRanges.length > 0
      ? new Set(filter.timeRanges)
      : null;
  const sourceSet =
    filter.sources && filter.sources.length > 0
      ? new Set(filter.sources)
      : null;
  const contextSet =
    filter.contexts && filter.contexts.length > 0
      ? new Set(filter.contexts)
      : null;

  return spawns.filter((s) => {
    if (sourceSet && s.sourceName && !sourceSet.has(s.sourceName)) return false;
    if (contextSet) {
      const ctx = s.context ?? "grounded";
      if (!contextSet.has(ctx)) return false;
    }
    if (biomeSet) {
      const match = s.biomes.some((b) => biomeSet.has(stripHash(b)));
      if (!match) return false;
    }
    const cond = (s.condition ?? {}) as Record<string, unknown>;
    if (typeof filter.minY === "number") {
      if (typeof cond.maxY === "number" && cond.maxY < filter.minY) return false;
    }
    if (typeof filter.maxY === "number") {
      if (typeof cond.minY === "number" && cond.minY > filter.maxY) return false;
    }
    if (timeSet) {
      const t = typeof cond.timeRange === "string" ? cond.timeRange : "any";
      // spawn marked "any" is kept; otherwise it must be in the selected set
      if (t !== "any" && !timeSet.has(t)) return false;
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
