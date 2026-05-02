/**
 * Curated world-graph seed: which mods own which dimensions, which
 * biomes belong to which dimension, which structures live where, and
 * what each dimension actually offers (day/night, weather, moon, sky).
 *
 * The Cobblemon spawn JSON references biomes by tag (e.g.
 * `#cobblemon:nether/is_basalt`). We populate `dimension_biomes` with
 * BOTH the curated tag list (so the dropdown only shows Overworld
 * tags under Overworld) and the raw biome ids actually referenced by
 * spawn entries (so a biome we forgot to curate still falls under the
 * right dimension if any existing spawn pins it).
 *
 * Run via `pnpm ingest:world` after the main ingest has populated the
 * spawn pool — that pass uses `spawns.biomes` to discover biome ids
 * we haven't catalogued yet.
 */
import { sql } from "drizzle-orm";
import { db, schema } from "../src/lib/db/client";
import { BIOME_SECTIONS } from "../src/lib/recommend/biome-sections";

type ModSeed = {
  id: string;
  label: string;
  locked?: boolean;
  sortOrder: number;
  dimensions: Array<{
    id: string;
    label: string;
    hasDayCycle: boolean;
    hasWeather: boolean;
    hasMoon: boolean;
    hasSky: boolean;
    sortOrder: number;
  }>;
};

/**
 * Vanilla Minecraft + Cobblemon are always present. Mods we know about
 * (Aether, Twilight Forest, Nullscape, Incendium…) seed their custom
 * dimensions. Adding a mod here is a one-line entry; the cascade UI
 * picks it up from the DB next refresh.
 */
const MODS: ModSeed[] = [
  {
    id: "minecraft",
    label: "Minecraft",
    locked: true,
    sortOrder: 0,
    dimensions: [
      {
        id: "minecraft:overworld",
        label: "Overworld",
        hasDayCycle: true,
        hasWeather: true,
        hasMoon: true,
        hasSky: true,
        sortOrder: 0,
      },
      {
        id: "minecraft:the_nether",
        label: "Nether",
        hasDayCycle: false,
        hasWeather: false,
        hasMoon: false,
        hasSky: false,
        sortOrder: 10,
      },
      {
        id: "minecraft:the_end",
        label: "End",
        hasDayCycle: false,
        hasWeather: false,
        hasMoon: false,
        hasSky: true,
        sortOrder: 20,
      },
    ],
  },
  {
    id: "cobblemon",
    label: "Cobblemon",
    locked: true,
    sortOrder: 1,
    dimensions: [],
  },
  {
    id: "aether",
    label: "The Aether",
    sortOrder: 100,
    dimensions: [
      {
        id: "aether:the_aether",
        label: "The Aether",
        hasDayCycle: true,
        hasWeather: true,
        hasMoon: true,
        hasSky: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "twilightforest",
    label: "Twilight Forest",
    sortOrder: 110,
    dimensions: [
      {
        id: "twilightforest:twilight_forest",
        label: "Twilight Forest",
        hasDayCycle: false,
        hasWeather: true,
        hasMoon: false,
        hasSky: true,
        sortOrder: 0,
      },
    ],
  },
  { id: "terralith", label: "Terralith", sortOrder: 200, dimensions: [] },
  { id: "biomesoplenty", label: "Biomes O' Plenty", sortOrder: 210, dimensions: [] },
  { id: "byg", label: "Oh The Biomes You'll Go", sortOrder: 220, dimensions: [] },
  { id: "incendium", label: "Incendium", sortOrder: 230, dimensions: [] },
  { id: "nullscape", label: "Nullscape", sortOrder: 240, dimensions: [] },
  { id: "the_bumblezone", label: "The Bumblezone", sortOrder: 250, dimensions: [] },
];

/**
 * Hand-picked structure → biome mapping for the cases where pinning
 * the structure changes catch strategy (Charcadet's ruined portal,
 * etc). Spawns whose `condition.structures` is set are also surfaced
 * automatically below; this list is just the well-known set.
 */
const STRUCTURE_SEEDS: Array<{
  biomeId: string;
  structures: Array<{ id: string; label: string }>;
}> = [
  {
    biomeId: "#cobblemon:is_overworld",
    structures: [
      { id: "minecraft:village", label: "Village" },
      { id: "minecraft:ruined_portal", label: "Ruined portal" },
      { id: "minecraft:pillager_outpost", label: "Pillager outpost" },
      { id: "minecraft:woodland_mansion", label: "Woodland mansion" },
      { id: "minecraft:stronghold", label: "Stronghold" },
      { id: "minecraft:ancient_city", label: "Ancient city" },
      { id: "minecraft:trial_chambers", label: "Trial chambers" },
      { id: "minecraft:trail_ruins", label: "Trail ruins" },
      { id: "minecraft:swamp_hut", label: "Witch hut" },
      { id: "minecraft:igloo", label: "Igloo" },
      { id: "minecraft:desert_pyramid", label: "Desert pyramid" },
      { id: "minecraft:jungle_pyramid", label: "Jungle temple" },
      { id: "minecraft:mineshaft", label: "Mineshaft" },
      { id: "minecraft:ocean_monument", label: "Ocean monument" },
      { id: "minecraft:shipwreck", label: "Shipwreck" },
      { id: "minecraft:ocean_ruin_warm", label: "Warm ocean ruin" },
      { id: "minecraft:ocean_ruin_cold", label: "Cold ocean ruin" },
      { id: "minecraft:buried_treasure", label: "Buried treasure" },
    ],
  },
  {
    biomeId: "#cobblemon:nether/is_wasteland",
    structures: [
      { id: "minecraft:fortress", label: "Nether fortress" },
      { id: "minecraft:bastion_remnant", label: "Bastion remnant" },
      { id: "minecraft:ruined_portal_nether", label: "Nether ruined portal" },
    ],
  },
  {
    biomeId: "#cobblemon:is_end",
    structures: [
      { id: "minecraft:end_city", label: "End city" },
      { id: "minecraft:stronghold", label: "Stronghold" },
    ],
  },
];

async function seed() {
  // Clear and repopulate authored content (idempotent).
  await db.execute(sql`TRUNCATE TABLE biome_structures, dimension_biomes, mod_dimensions, mods RESTART IDENTITY`);

  for (const mod of MODS) {
    await db.insert(schema.mods).values({
      id: mod.id,
      label: mod.label,
      sortOrder: mod.sortOrder,
      locked: mod.locked ? 1 : 0,
    });
    for (const dim of mod.dimensions) {
      await db.insert(schema.modDimensions).values({
        modId: mod.id,
        dimensionId: dim.id,
        label: dim.label,
        hasDayCycle: dim.hasDayCycle ? 1 : 0,
        hasWeather: dim.hasWeather ? 1 : 0,
        hasMoon: dim.hasMoon ? 1 : 0,
        hasSky: dim.hasSky ? 1 : 0,
        sortOrder: dim.sortOrder,
      });
    }
  }

  // BIOME_SECTIONS already encodes the curated dimension for every
  // tag we care about; we mirror it into dimension_biomes.
  let biomeSort = 0;
  for (const section of BIOME_SECTIONS) {
    if (!section.dimension) continue;
    for (const tag of section.tags) {
      const label = tag
        .replace(/^#?[a-z0-9_]+:/, "")
        .replace(/^nether\//, "")
        .replace(/^space\//, "")
        .replace(/^is_/, "")
        .replace(/_/g, " ");
      try {
        await db
          .insert(schema.dimensionBiomes)
          .values({
            dimensionId: section.dimension,
            biomeId: tag,
            label,
            section: section.title,
            sortOrder: biomeSort++,
          })
          .onConflictDoNothing();
      } catch (err) {
        console.warn(`[world-graph] skip biome ${tag}:`, err);
      }
    }
  }

  // Bring in any biome the spawn table actually uses but that we
  // didn't catalogue. We default-bucket those to Overworld and let a
  // human curator move them later if needed.
  const seenBiomes = await db.execute(sql`
    SELECT DISTINCT trim(both '"' from b)::text AS biome
    FROM spawns, jsonb_array_elements_text(biomes) AS b
  `);
  const knownBiomes = new Set<string>();
  const existing = await db.select().from(schema.dimensionBiomes);
  for (const e of existing) knownBiomes.add(e.biomeId);
  type Row = { biome: string };
  const newBiomes: string[] = [];
  for (const row of (seenBiomes as unknown as { rows: Row[] }).rows ??
    (seenBiomes as unknown as Row[])) {
    if (!row?.biome || knownBiomes.has(row.biome)) continue;
    newBiomes.push(row.biome);
  }
  for (const b of newBiomes) {
    let dimension = "minecraft:overworld";
    if (b.includes("nether/") || b.includes(":nether_")) dimension = "minecraft:the_nether";
    else if (b.includes(":the_end") || b.includes("end/") || b.includes(":end_")) dimension = "minecraft:the_end";
    else if (b.includes("aether:")) dimension = "aether:the_aether";
    else if (b.includes("twilightforest:")) dimension = "twilightforest:twilight_forest";
    const label = b
      .replace(/^#?[a-z0-9_]+:/, "")
      .replace(/^nether\//, "")
      .replace(/^is_/, "")
      .replace(/_/g, " ");
    await db
      .insert(schema.dimensionBiomes)
      .values({
        dimensionId: dimension,
        biomeId: b,
        label,
        section: "Auto",
        sortOrder: 1000 + biomeSort++,
      })
      .onConflictDoNothing();
  }

  // Hand-curated structures + structures the spawn entries pin via
  // condition.structures.
  for (const seed of STRUCTURE_SEEDS) {
    for (const s of seed.structures) {
      await db
        .insert(schema.biomeStructures)
        .values({ biomeId: seed.biomeId, structureId: s.id, label: s.label })
        .onConflictDoNothing();
    }
  }
  const structuresFromSpawns = await db.execute(sql`
    SELECT DISTINCT
      b.biome,
      trim(both '"' from s)::text AS struct
    FROM spawns
    CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(condition->'structures', '[]'::jsonb)) AS s
    CROSS JOIN LATERAL jsonb_array_elements_text(biomes) AS b(biome)
    WHERE condition ? 'structures'
  `);
  type Pair = { biome: string; struct: string };
  for (const row of (structuresFromSpawns as unknown as { rows: Pair[] }).rows ??
    (structuresFromSpawns as unknown as Pair[])) {
    if (!row?.biome || !row?.struct) continue;
    const label = row.struct
      .replace(/^[a-z0-9_]+:/, "")
      .replace(/^#/, "")
      .replace(/_/g, " ");
    await db
      .insert(schema.biomeStructures)
      .values({ biomeId: row.biome, structureId: row.struct, label })
      .onConflictDoNothing();
  }

  console.log("[world-graph] seed complete");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
