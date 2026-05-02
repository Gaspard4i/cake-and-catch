import {
  pgTable,
  serial,
  integer,
  text,
  real,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const bucketEnum = pgEnum("bucket", ["common", "uncommon", "rare", "ultra-rare"]);
export const sourceKindEnum = pgEnum("source_kind", ["mod", "wiki", "derived", "addon"]);

export const species = pgTable(
  "species",
  {
    id: serial("id").primaryKey(),
    dexNo: integer("dex_no").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    primaryType: text("primary_type").notNull(),
    secondaryType: text("secondary_type"),
    baseStats: jsonb("base_stats").$type<Record<string, number>>().notNull(),
    abilities: jsonb("abilities").$type<string[]>().notNull(),
    catchRate: integer("catch_rate").notNull(),
    baseFriendship: integer("base_friendship"),
    preferredFlavours: jsonb("preferred_flavours").$type<string[]>(),
    labels: jsonb("labels").$type<string[]>().notNull(),
    raw: jsonb("raw").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("species_slug_idx").on(t.slug), index("species_dex_idx").on(t.dexNo)],
);

export const spawns = pgTable(
  "spawns",
  {
    id: serial("id").primaryKey(),
    speciesId: integer("species_id")
      .notNull()
      .references(() => species.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    bucket: bucketEnum("bucket").notNull(),
    weight: real("weight").notNull(),
    /**
     * Cobblemon `percentage` field. When set, takes precedence over `weight`
     * during spawn selection (Phase 1). Sum across a bucket+positionType
     * must stay <= 100; otherwise Cobblemon aborts the whole tick.
     */
    percentage: real("percentage"),
    levelMin: integer("level_min").notNull(),
    levelMax: integer("level_max").notNull(),
    context: text("context"),
    biomes: jsonb("biomes").$type<string[]>().notNull(),
    condition: jsonb("condition"),
    anticondition: jsonb("anticondition"),
    /**
     * `weightMultiplier` (or array `weightMultipliers`) from upstream JSON.
     * Each entry multiplies the spawn's effective weight when its
     * sub-condition is met (e.g. ×2 in the rain).
     */
    weightMultipliers: jsonb("weight_multipliers"),
    /** `compositeCondition` from upstream — nested AND/OR groups. */
    compositeCondition: jsonb("composite_condition"),
    presets: jsonb("presets").$type<string[]>().notNull(),
    sourceKind: sourceKindEnum("source_kind").notNull().default("mod"),
    sourceName: text("source_name").notNull().default("cobblemon"),
    sourceUrl: text("source_url"),
  },
  (t) => [
    uniqueIndex("spawns_external_idx").on(t.externalId, t.sourceName),
    index("spawns_species_idx").on(t.speciesId),
    index("spawns_source_idx").on(t.sourceKind, t.sourceName),
  ],
);

/**
 * Cobblemon `spawn_detail_presets/*.json`. Stored verbatim so that ingestion
 * can resolve `spawn.presets[]` → conditions/anticonditions and merge them
 * into the spawn entry. Without this table, ~80% of spawns appear to have
 * empty conditions in the UI (they actually inherit from a preset).
 */
export const spawnPresets = pgTable(
  "spawn_presets",
  {
    name: text("name").primaryKey(),
    condition: jsonb("condition"),
    anticondition: jsonb("anticondition"),
    context: text("context"),
    raw: jsonb("raw").notNull(),
    sourceUrl: text("source_url"),
  },
);

export const dataSources = pgTable(
  "data_sources",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    kind: sourceKindEnum("kind").notNull(),
    url: text("url").notNull(),
    commitSha: text("commit_sha"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("data_sources_entity_idx").on(t.entityType, t.entityId)],
);

export const recipeKindEnum = pgEnum("recipe_kind", [
  "cake",
  "bait",
  "snack",
  "aprijuice",
  "other",
]);

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    kind: recipeKindEnum("kind").notNull(),
    resultId: text("result_id").notNull(),
    resultCount: integer("result_count").notNull().default(1),
    shape: text("shape").notNull(), // 'shaped' | 'shapeless'
    grid: jsonb("grid"), // GridCell[][] for shaped
    ingredients: jsonb("ingredients"), // Array for shapeless
    seasoningTag: text("seasoning_tag"),
    seasoningProcessors: jsonb("seasoning_processors").$type<string[]>().notNull(),
    raw: jsonb("raw").notNull(),
  },
  (t) => [uniqueIndex("recipes_slug_idx").on(t.slug), index("recipes_kind_idx").on(t.kind)],
);

export const seasonings = pgTable(
  "seasonings",
  {
    id: serial("id").primaryKey(),
    itemId: text("item_id").notNull(),
    slug: text("slug").notNull(),
    colour: text("colour"),
    raw: jsonb("raw").notNull(),
  },
  (t) => [uniqueIndex("seasonings_slug_idx").on(t.slug)],
);

export const baitEffects = pgTable(
  "bait_effects",
  {
    id: serial("id").primaryKey(),
    itemId: text("item_id").notNull(),
    slug: text("slug").notNull(),
    effects: jsonb("effects").$type<Array<Record<string, unknown>>>().notNull(),
    raw: jsonb("raw").notNull(),
  },
  (t) => [uniqueIndex("bait_effects_slug_idx").on(t.slug)],
);

export const berries = pgTable(
  "berries",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    itemId: text("item_id").notNull(),
    flavours: jsonb("flavours").$type<Record<string, number>>().notNull(),
    dominantFlavour: text("dominant_flavour"),
    colour: text("colour"),
    weight: real("weight"),
    description: text("description"),
    /**
     * Effect tags this berry belongs to, from upstream
     * `tags/item/berries/*.json`. Possible values:
     *   hp_recovery, status_recovery, pp_recovery, nature_recovery,
     *   friendship, damage_reduction, stat_buff, damaging, non_battle, filling.
     */
    effectTags: jsonb("effect_tags").$type<string[]>().notNull().default([]),
    /**
     * Placements used when this berry sits on top of a Poké Snack. Upstream
     * field `pokeSnackPositionings[]`: up to 3 entries with `position` and
     * `rotation` in Bedrock-model space (16 units per block).
     */
    snackPositionings: jsonb("snack_positionings")
      .$type<
        Array<{
          position: { x: number; y: number; z: number };
          rotation: { x: number; y: number; z: number };
        }>
      >()
      .notNull()
      .default([]),
    /**
     * Path of the Bedrock 3D model (relative to /textures/cobblemon/bedrock/).
     * Nullable when the .geo.json is missing.
     */
    fruitModel: text("fruit_model"),
    /** Path of the fruit texture served under /textures/cobblemon/berries/. */
    fruitTexture: text("fruit_texture"),
    raw: jsonb("raw").notNull(),
  },
  (t) => [uniqueIndex("berries_slug_idx").on(t.slug)],
);

export const speciesWiki = pgTable(
  "species_wiki",
  {
    id: serial("id").primaryKey(),
    speciesId: integer("species_id")
      .notNull()
      .references(() => species.id, { onDelete: "cascade" }),
    pageTitle: text("page_title").notNull(),
    pageUrl: text("page_url").notNull(),
    summary: text("summary"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("species_wiki_species_idx").on(t.speciesId)],
);

/**
 * World graph — what the cascade UI relies on so the biome dropdown
 * never offers a Nether tag while Overworld is the only dimension
 * picked. Authored content (curated locally + ingested from upstream
 * tags), refreshed at ingest time.
 *
 *   mods  →  mod_dimensions  →  dimension_biomes
 *                            ↘  dimension_traits  (hasDayCycle, hasWeather, …)
 *   dimension_biomes        →  biome_structures
 *
 * Every relation is keyed on the upstream id (e.g. `minecraft:overworld`,
 * `#cobblemon:is_lush`, `minecraft:village`) — that's the vocabulary
 * spawn JSONs use, so the join with the spawn table needs no translation.
 */
export const mods = pgTable(
  "mods",
  {
    /** Upstream namespace, e.g. "cobblemon", "minecraft", "aether". */
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    /** Sort order in the UI dropdown. Lower comes first. */
    sortOrder: integer("sort_order").notNull().default(100),
    locked: integer("locked").notNull().default(0),
  },
);

export const modDimensions = pgTable(
  "mod_dimensions",
  {
    modId: text("mod_id")
      .notNull()
      .references(() => mods.id, { onDelete: "cascade" }),
    dimensionId: text("dimension_id").notNull(),
    label: text("label").notNull(),
    /** Whether the dimension has a day/night cycle, weather, moon, sky. */
    hasDayCycle: integer("has_day_cycle").notNull().default(1),
    hasWeather: integer("has_weather").notNull().default(1),
    hasMoon: integer("has_moon").notNull().default(1),
    hasSky: integer("has_sky").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(100),
  },
  (t) => [
    uniqueIndex("mod_dimensions_idx").on(t.modId, t.dimensionId),
    index("mod_dimensions_dim_idx").on(t.dimensionId),
  ],
);

export const dimensionBiomes = pgTable(
  "dimension_biomes",
  {
    dimensionId: text("dimension_id").notNull(),
    /** Biome id or `#tag` exactly as it appears in spawn JSONs. */
    biomeId: text("biome_id").notNull(),
    label: text("label").notNull(),
    /** Optional grouping for the dropdown (Forest, Wetlands, …). */
    section: text("section"),
    sortOrder: integer("sort_order").notNull().default(100),
  },
  (t) => [
    uniqueIndex("dimension_biomes_idx").on(t.dimensionId, t.biomeId),
    index("dimension_biomes_biome_idx").on(t.biomeId),
  ],
);

export const biomeStructures = pgTable(
  "biome_structures",
  {
    biomeId: text("biome_id").notNull(),
    structureId: text("structure_id").notNull(),
    label: text("label").notNull(),
  },
  (t) => [
    uniqueIndex("biome_structures_idx").on(t.biomeId, t.structureId),
    index("biome_structures_struct_idx").on(t.structureId),
  ],
);

/**
 * Aggregated site-wide counters and rating sum. Single-row table
 * (id=1). Kept as a row instead of Redis/KV to avoid adding an
 * infrastructure dependency. Updates are UPSERTs with atomic SQL
 * increments (`col = col + 1`) so concurrent visits don't clobber.
 */
export const siteStats = pgTable("site_stats", {
  id: integer("id").primaryKey().default(1),
  visits: integer("visits").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  ratingSum: integer("rating_sum").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Individual rating submissions. We keep them so we can moderate,
 * deduplicate abuse (same IP hash), and change aggregation rules later
 * without losing data. `ipHash` is sha256(ip + secret) — never the raw IP.
 */
export const siteRatings = pgTable(
  "site_ratings",
  {
    id: serial("id").primaryKey(),
    stars: integer("stars").notNull(),
    comment: text("comment"),
    locale: text("locale"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("site_ratings_created_idx").on(t.createdAt)],
);

export type Species = typeof species.$inferSelect;
export type NewSpecies = typeof species.$inferInsert;
export type Spawn = typeof spawns.$inferSelect;
export type NewSpawn = typeof spawns.$inferInsert;
export type Seasoning = typeof seasonings.$inferSelect;
export type BaitEffect = typeof baitEffects.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type SpeciesWiki = typeof speciesWiki.$inferSelect;
export type Berry = typeof berries.$inferSelect;
export type SpawnPreset = typeof spawnPresets.$inferSelect;
export type NewSpawnPreset = typeof spawnPresets.$inferInsert;
