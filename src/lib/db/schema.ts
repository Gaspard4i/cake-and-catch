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
    levelMin: integer("level_min").notNull(),
    levelMax: integer("level_max").notNull(),
    context: text("context"),
    biomes: jsonb("biomes").$type<string[]>().notNull(),
    condition: jsonb("condition"),
    anticondition: jsonb("anticondition"),
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

export type Species = typeof species.$inferSelect;
export type NewSpecies = typeof species.$inferInsert;
export type Spawn = typeof spawns.$inferSelect;
export type NewSpawn = typeof spawns.$inferInsert;
export type Seasoning = typeof seasonings.$inferSelect;
export type BaitEffect = typeof baitEffects.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type SpeciesWiki = typeof speciesWiki.$inferSelect;
export type Berry = typeof berries.$inferSelect;
