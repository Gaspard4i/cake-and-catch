/**
 * Curated grouping of every Cobblemon + Minecraft biome tag exposed by
 * upstream as of mid-2026 (76 Cobblemon tags + the vanilla biomes a
 * player will most often pin in a snack filter). The order of the
 * sections is the order they should appear in the UI: surface biomes
 * first, then dimensional pockets (cave / Nether / End / Sky / Space).
 *
 * Tag list verified against
 * gitlab.com/cable-mc/cobblemon/-/tree/main/common/src/main/resources/data/cobblemon/tags/worldgen/biome
 * via deep research, May 2026.
 */
export const BIOME_SECTIONS: { title: string; tags: string[]; dimension: string | null }[] = [
  {
    title: "Catch-all (overworld)",
    dimension: "minecraft:overworld",
    tags: [
      // Catch-all tag used by ~700 vanilla Cobblemon spawns. Matches
      // any Overworld biome — surfacing it as a section title rather
      // than burying it lets the player pin "anywhere in the
      // Overworld" cleanly.
      "cobblemon:is_overworld",
    ],
  },
  {
    title: "Forests & woods",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_forest",
      "cobblemon:is_taiga",
      "cobblemon:is_snowy_forest",
      "cobblemon:is_snowy_taiga",
      "cobblemon:is_jungle",
      "cobblemon:is_bamboo",
      "cobblemon:is_cherry_blossom",
      "cobblemon:is_spooky",
      "cobblemon:is_mushroom",
      "minecraft:forest",
      "minecraft:birch_forest",
      "minecraft:dark_forest",
      "minecraft:taiga",
      "minecraft:old_growth_pine_taiga",
      "minecraft:old_growth_spruce_taiga",
      "minecraft:jungle",
      "minecraft:bamboo_jungle",
      "minecraft:cherry_grove",
    ],
  },
  {
    title: "Plains & meadows",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_plains",
      "cobblemon:is_grassland",
      "cobblemon:is_floral",
      "cobblemon:is_shrubland",
      "cobblemon:is_temperate",
      "minecraft:plains",
      "minecraft:sunflower_plains",
      "minecraft:meadow",
      "minecraft:flower_forest",
    ],
  },
  {
    title: "Savanna & arid",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_savanna",
      "cobblemon:is_arid",
      "cobblemon:is_desert",
      "cobblemon:is_badlands",
      "cobblemon:is_sandy",
      "minecraft:savanna",
      "minecraft:savanna_plateau",
      "minecraft:windswept_savanna",
      "minecraft:desert",
      "minecraft:badlands",
      "minecraft:eroded_badlands",
      "minecraft:wooded_badlands",
    ],
  },
  {
    title: "Wetlands & coast",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_swamp",
      "cobblemon:is_river",
      "cobblemon:is_freshwater",
      "cobblemon:is_beach",
      "cobblemon:is_coast",
      "cobblemon:is_stony_beach",
      "cobblemon:is_island",
      "cobblemon:is_tropical_island",
      "cobblemon:is_mirage_island",
      "minecraft:swamp",
      "minecraft:mangrove_swamp",
      "minecraft:river",
      "minecraft:beach",
      "minecraft:stony_shore",
    ],
  },
  {
    title: "Mountains & highlands",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_mountain",
      "cobblemon:is_peak",
      "cobblemon:is_highlands",
      "cobblemon:is_hills",
      "cobblemon:is_plateau",
      "minecraft:windswept_hills",
      "minecraft:windswept_gravelly_hills",
      "minecraft:windswept_forest",
      "minecraft:jagged_peaks",
      "minecraft:frozen_peaks",
      "minecraft:stony_peaks",
    ],
  },
  {
    title: "Cold & frozen",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_cold",
      "cobblemon:is_snowy",
      "cobblemon:is_freezing",
      "cobblemon:is_tundra",
      "cobblemon:is_glacial",
      "cobblemon:is_frozen_ocean",
      "minecraft:snowy_plains",
      "minecraft:snowy_taiga",
      "minecraft:snowy_beach",
      "minecraft:snowy_slopes",
      "minecraft:grove",
      "minecraft:ice_spikes",
      "minecraft:frozen_river",
      "minecraft:frozen_ocean",
      "minecraft:deep_frozen_ocean",
    ],
  },
  {
    title: "Ocean & aquatic",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_ocean",
      "cobblemon:is_deep_ocean",
      "cobblemon:is_warm_ocean",
      "cobblemon:is_lukewarm_ocean",
      "cobblemon:is_temperate_ocean",
      "cobblemon:is_cold_ocean",
      "minecraft:ocean",
      "minecraft:deep_ocean",
      "minecraft:warm_ocean",
      "minecraft:lukewarm_ocean",
      "minecraft:cold_ocean",
      "minecraft:deep_lukewarm_ocean",
      "minecraft:deep_cold_ocean",
    ],
  },
  {
    title: "Underground & caves",
    dimension: "minecraft:overworld",
    tags: [
      "cobblemon:is_cave",
      "cobblemon:is_lush",
      "cobblemon:is_dripstone",
      "cobblemon:is_deep_dark",
      "cobblemon:is_thermal",
      "cobblemon:is_volcanic",
      "minecraft:lush_caves",
      "minecraft:dripstone_caves",
      "minecraft:deep_dark",
    ],
  },
  {
    title: "Nether",
    dimension: "minecraft:the_nether",
    tags: [
      "cobblemon:nether/is_wasteland",
      "cobblemon:nether/is_crimson",
      "cobblemon:nether/is_warped",
      "cobblemon:nether/is_soul_sand",
      "cobblemon:nether/is_soul_fire",
      "cobblemon:nether/is_basalt",
      "cobblemon:nether/is_quartz",
      "cobblemon:nether/is_forest",
      "cobblemon:nether/is_fungus",
      "cobblemon:nether/is_mountain",
      "cobblemon:nether/is_overgrowth",
      "cobblemon:nether/is_desert",
      "cobblemon:nether/is_frozen",
      "cobblemon:nether/is_toxic",
      "minecraft:nether_wastes",
      "minecraft:crimson_forest",
      "minecraft:warped_forest",
      "minecraft:soul_sand_valley",
      "minecraft:basalt_deltas",
    ],
  },
  {
    title: "End",
    dimension: "minecraft:the_end",
    tags: [
      "cobblemon:is_end",
      "minecraft:the_end",
      "minecraft:end_highlands",
      "minecraft:end_midlands",
      "minecraft:end_barrens",
      "minecraft:small_end_islands",
    ],
  },
  {
    title: "Sky & magical (Aether, …)",
    dimension: null,
    tags: ["cobblemon:is_sky", "cobblemon:is_magical"],
  },
  {
    title: "Space (planet mods)",
    dimension: null,
    tags: [
      "cobblemon:space/is_space",
      "cobblemon:space/is_moon",
      "cobblemon:space/is_mars",
      "cobblemon:space/is_mercury",
      "cobblemon:space/is_venus",
      "cobblemon:space/is_fiery",
      "cobblemon:space/is_icy",
    ],
  },
];

/** Strip `#` prefix and namespace, surface a humane label. */
export function biomeLabel(tag: string): string {
  const stripped = tag.replace(/^#/, "");
  const noNamespace = stripped.includes(":")
    ? stripped.slice(stripped.indexOf(":") + 1)
    : stripped;
  return noNamespace
    .replace(/^nether\//, "")
    .replace(/^space\//, "")
    .replace(/^is_/, "")
    .replace(/_/g, " ");
}

/**
 * Dimensional traits the UI uses to grey out time / weather / moon
 * controls when the player picks a dimension that does not have them.
 */
export type DimensionTraits = {
  hasDayCycle: boolean;
  hasWeather: boolean;
  hasMoon: boolean;
  hasSky: boolean;
};

export const DIMENSION_TRAITS: Record<string, DimensionTraits> = {
  "minecraft:overworld": {
    hasDayCycle: true,
    hasWeather: true,
    hasMoon: true,
    hasSky: true,
  },
  "minecraft:the_nether": {
    // Nether: no day/night cycle, no weather, no visible sky/moon — only
    // a fixed red fog. Time-based and moon-based spawn conditions never
    // fire here in Minecraft's logic.
    hasDayCycle: false,
    hasWeather: false,
    hasMoon: false,
    hasSky: false,
  },
  "minecraft:the_end": {
    // End: no day cycle, no weather; the sky exists but it's a fixed
    // dark void — moon phase never advances.
    hasDayCycle: false,
    hasWeather: false,
    hasMoon: false,
    hasSky: true,
  },
};

/**
 * Returns the subset of dimension traits valid for the dimensions the
 * player has currently picked. With no selection we ASSUME the player
 * doesn't know yet (and we display nothing — see the dimension-required
 * gating in CampfirePot). With multiple selections we take the OR
 * (Nether + Overworld means weather is on the table somewhere).
 */
export function aggregateTraits(dimensions: string[]): DimensionTraits {
  if (dimensions.length === 0) {
    return { hasDayCycle: true, hasWeather: true, hasMoon: true, hasSky: true };
  }
  const out: DimensionTraits = {
    hasDayCycle: false,
    hasWeather: false,
    hasMoon: false,
    hasSky: false,
  };
  for (const d of dimensions) {
    const t = DIMENSION_TRAITS[d];
    if (!t) {
      // Unknown dimension (modded). Assume full traits — we'd rather
      // overshoot than hide a control the player needs.
      return { hasDayCycle: true, hasWeather: true, hasMoon: true, hasSky: true };
    }
    out.hasDayCycle ||= t.hasDayCycle;
    out.hasWeather ||= t.hasWeather;
    out.hasMoon ||= t.hasMoon;
    out.hasSky ||= t.hasSky;
  }
  return out;
}
