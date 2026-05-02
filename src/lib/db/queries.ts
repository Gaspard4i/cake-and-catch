import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, safe, schema } from "./client";

const ONE_HOUR = 60 * 60;
const SIX_HOURS = 6 * ONE_HOUR;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Cache wrapper for read-only DB queries that only change at ingest time.
 * Routes through Next.js's Data Cache (Vercel Data Cache in production),
 * so repeated reads inside the window short-circuit Neon entirely. This is
 * the single biggest lever to stay under Neon's free-tier egress quota.
 */
function cached<TArgs extends readonly unknown[], TResult>(
  keyPrefix: string,
  ttl: number,
  loader: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) =>
    unstable_cache(() => loader(...args), [keyPrefix, JSON.stringify(args)], {
      revalidate: ttl,
      tags: [keyPrefix],
    })();
}

export const getSpeciesBySlug = cached(
  "species-by-slug",
  ONE_HOUR,
  async (slug: string) =>
    safe(async () => {
      const rows = await db
        .select()
        .from(schema.species)
        .where(eq(schema.species.slug, slug))
        .limit(1);
      return rows[0] ?? null;
    }, null),
);

export const listSpawnsForSpecies = cached(
  "spawns-for-species",
  ONE_HOUR,
  async (speciesId: number) =>
    safe(
      () =>
        db
          .select()
          .from(schema.spawns)
          .where(eq(schema.spawns.speciesId, speciesId))
          .orderBy(
            asc(
              sql`case ${schema.spawns.sourceKind} when 'mod' then 0 else 1 end`,
            ),
            desc(schema.spawns.weight),
          ),
      [] as Array<typeof schema.spawns.$inferSelect>,
    ),
);

/**
 * Cobblemon-only spawns for a species. Used by the Cobbledex page so
 * datapacks/addons never sneak into the canonical spawn list — addon
 * spawns are still queryable via {@link listSpawnsForSpecies}.
 */
export const listCobblemonSpawnsForSpecies = cached(
  "cobblemon-spawns-for-species",
  ONE_HOUR,
  async (speciesId: number) =>
    safe(
      () =>
        db
          .select()
          .from(schema.spawns)
          .where(
            and(
              eq(schema.spawns.speciesId, speciesId),
              eq(schema.spawns.sourceName, "cobblemon"),
              eq(schema.spawns.sourceKind, "mod"),
            ),
          )
          .orderBy(desc(schema.spawns.weight)),
      [] as Array<typeof schema.spawns.$inferSelect>,
    ),
);

export const getSourcesFor = cached(
  "sources-for",
  ONE_HOUR,
  async (entityType: string, entityId: number) =>
    safe(
      () =>
        db
          .select()
          .from(schema.dataSources)
          .where(
            and(
              eq(schema.dataSources.entityType, entityType),
              eq(schema.dataSources.entityId, entityId),
            ),
          ),
      [] as Array<typeof schema.dataSources.$inferSelect>,
    ),
);

export const getWikiSummary = cached(
  "wiki-summary",
  ONE_HOUR,
  async (speciesId: number) =>
    safe(async () => {
      const rows = await db
        .select()
        .from(schema.speciesWiki)
        .where(eq(schema.speciesWiki.speciesId, speciesId))
        .limit(1);
      return rows[0] ?? null;
    }, null),
);

export async function searchSpecies(query: string, limit = 20) {
  return safe(
    () => {
      if (!query) {
        return db.select().from(schema.species).orderBy(asc(schema.species.dexNo)).limit(limit);
      }
      return db
        .select()
        .from(schema.species)
        .where(ilike(schema.species.name, `%${query}%`))
        .orderBy(asc(schema.species.dexNo))
        .limit(limit);
    },
    [] as Array<typeof schema.species.$inferSelect>,
  );
}

export type SpeciesFilters = {
  q?: string;
  type?: string;
  bucket?: string;
  source?: string;
};

export async function searchSpeciesFiltered(filters: SpeciesFilters, limit = 100) {
  return safe(
    async () => {
      const where: ReturnType<typeof sql>[] = [];
      if (filters.q) where.push(sql`${schema.species.name} ILIKE ${"%" + filters.q + "%"}`);
      if (filters.type)
        where.push(
          sql`(${schema.species.primaryType} = ${filters.type} OR ${schema.species.secondaryType} = ${filters.type})`,
        );

      const needsSpawns = Boolean(filters.bucket || filters.source);

      if (needsSpawns) {
        const spawnWhere: ReturnType<typeof sql>[] = [];
        if (filters.bucket) spawnWhere.push(sql`${schema.spawns.bucket} = ${filters.bucket}`);
        if (filters.source) spawnWhere.push(sql`${schema.spawns.sourceName} = ${filters.source}`);
        const spawnCondition =
          spawnWhere.length > 0 ? sql` AND ${sql.join(spawnWhere, sql` AND `)}` : sql``;
        const whereCondition =
          where.length > 0 ? sql` AND ${sql.join(where, sql` AND `)}` : sql``;
        const rows = await db.execute<typeof schema.species.$inferSelect>(
          sql`
            SELECT DISTINCT ${schema.species}.*
            FROM ${schema.species}
            INNER JOIN ${schema.spawns} ON ${schema.spawns.speciesId} = ${schema.species.id}${spawnCondition}
            WHERE 1=1${whereCondition}
            ORDER BY ${schema.species.dexNo} ASC
            LIMIT ${limit}
          `,
        );
        return rows;
      }

      let q = db.select().from(schema.species).$dynamic();
      if (where.length > 0) q = q.where(sql.join(where, sql` AND `));
      return q.orderBy(asc(schema.species.dexNo)).limit(limit);
    },
    [] as Array<typeof schema.species.$inferSelect>,
  );
}

export const listSourceNames = cached("source-names", ONE_DAY, async () =>
  safe(async () => {
    const rows = await db
      .selectDistinct({ sourceName: schema.spawns.sourceName })
      .from(schema.spawns)
      .orderBy(asc(schema.spawns.sourceName));
    return rows.map((r) => r.sourceName);
  }, [] as string[]),
);

export const countSpecies = cached("count-species", ONE_DAY, async () =>
  safe(async () => {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.species);
    return row.count;
  }, 0),
);

export const listBaitEffects = cached("bait-effects", SIX_HOURS, async () =>
  safe(
    () => db.select().from(schema.baitEffects),
    [] as Array<typeof schema.baitEffects.$inferSelect>,
  ),
);

export const listSeasonings = cached("seasonings", SIX_HOURS, async () =>
  safe(
    () => db.select().from(schema.seasonings),
    [] as Array<typeof schema.seasonings.$inferSelect>,
  ),
);

export const listAllSeasonings = cached("seasonings-all", SIX_HOURS, async () =>
  safe(
    () => db.select().from(schema.seasonings).orderBy(asc(schema.seasonings.slug)),
    [] as Array<typeof schema.seasonings.$inferSelect>,
  ),
);

export const listBerries = cached("berries", SIX_HOURS, async () =>
  safe(
    () => db.select().from(schema.berries).orderBy(asc(schema.berries.slug)),
    [] as Array<typeof schema.berries.$inferSelect>,
  ),
);

export async function getBerriesBySlug(slugs: string[]) {
  if (slugs.length === 0) return [];
  return safe(
    () => db.select().from(schema.berries).where(sql`${schema.berries.slug} IN ${slugs}`),
    [] as Array<typeof schema.berries.$inferSelect>,
  );
}

export type SpawnWithSpecies = {
  spawnId: number;
  speciesId: number;
  bucket: "common" | "uncommon" | "rare" | "ultra-rare";
  weight: number;
  levelMin: number;
  levelMax: number;
  biomes: string[];
  condition: unknown;
  anticondition: unknown;
  context: string | null;
  sourceKind: "mod" | "wiki" | "derived" | "addon";
  sourceName: string;
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
  preferredFlavours: string[] | null;
  /**
   * Egg groups extracted server-side from `species.raw->'eggGroups'`. Avoids
   * pulling the whole `raw` JSONB blob on every call (the biggest single
   * egress contributor on Neon).
   */
  eggGroups: string[];
};

export const listSpawnsWithSpecies = cached(
  "spawns-with-species",
  SIX_HOURS,
  async (limit: number = 5000): Promise<SpawnWithSpecies[]> =>
    safe(
      () =>
        db
          .select({
            spawnId: schema.spawns.id,
            speciesId: schema.spawns.speciesId,
            bucket: schema.spawns.bucket,
            weight: schema.spawns.weight,
            levelMin: schema.spawns.levelMin,
            levelMax: schema.spawns.levelMax,
            biomes: schema.spawns.biomes,
            condition: schema.spawns.condition,
            anticondition: schema.spawns.anticondition,
            context: schema.spawns.context,
            sourceKind: schema.spawns.sourceKind,
            sourceName: schema.spawns.sourceName,
            slug: schema.species.slug,
            name: schema.species.name,
            dexNo: schema.species.dexNo,
            primaryType: schema.species.primaryType,
            secondaryType: schema.species.secondaryType,
            preferredFlavours: schema.species.preferredFlavours,
            eggGroups: sql<
              string[]
            >`coalesce(${schema.species.raw} -> 'eggGroups', '[]'::jsonb)`.as(
              "egg_groups",
            ),
          })
          .from(schema.spawns)
          .innerJoin(schema.species, eq(schema.species.id, schema.spawns.speciesId))
          .limit(limit) as unknown as Promise<SpawnWithSpecies[]>,
      [] as SpawnWithSpecies[],
    ),
);

export const listCoreRecipes = cached("core-recipes", SIX_HOURS, async () =>
  safe(
    () =>
      db
        .select()
        .from(schema.recipes)
        .where(sql`${schema.recipes.kind} IN ('cake','bait','snack','aprijuice')`)
        .orderBy(asc(schema.recipes.kind), asc(schema.recipes.slug)),
    [] as Array<typeof schema.recipes.$inferSelect>,
  ),
);

export const getRecipeBySlug = cached(
  "recipe-by-slug",
  SIX_HOURS,
  async (slug: string) =>
    safe(async () => {
      const rows = await db
        .select()
        .from(schema.recipes)
        .where(eq(schema.recipes.slug, slug))
        .limit(1);
      return rows[0] ?? null;
    }, null),
);

export const listSpawnsForBiome = cached(
  "spawns-for-biome",
  ONE_HOUR,
  async (biomeKey: string, limit: number = 200) =>
    safe(
      () =>
        db
          .select({
            spawnId: schema.spawns.id,
            speciesId: schema.spawns.speciesId,
            bucket: schema.spawns.bucket,
            weight: schema.spawns.weight,
            levelMin: schema.spawns.levelMin,
            levelMax: schema.spawns.levelMax,
            sourceKind: schema.spawns.sourceKind,
            sourceName: schema.spawns.sourceName,
            sourceUrl: schema.spawns.sourceUrl,
            condition: schema.spawns.condition,
            slug: schema.species.slug,
            name: schema.species.name,
            primaryType: schema.species.primaryType,
            secondaryType: schema.species.secondaryType,
            dexNo: schema.species.dexNo,
          })
          .from(schema.spawns)
          .innerJoin(schema.species, eq(schema.species.id, schema.spawns.speciesId))
          .where(sql`${schema.spawns.biomes} @> ${JSON.stringify([biomeKey])}::jsonb`)
          .orderBy(desc(schema.spawns.weight))
          .limit(limit),
      [] as Array<{
        spawnId: number;
        speciesId: number;
        bucket: "common" | "uncommon" | "rare" | "ultra-rare";
        weight: number;
        levelMin: number;
        levelMax: number;
        sourceKind: "mod" | "wiki" | "derived" | "addon";
        sourceName: string;
        sourceUrl: string | null;
        condition: unknown;
        slug: string;
        name: string;
        primaryType: string;
        secondaryType: string | null;
        dexNo: number;
      }>,
    ),
);

export const listDistinctBiomes = cached("distinct-biomes", ONE_DAY, async () =>
  safe(async () => {
    const rows = await db.execute<{ biome: string }>(
      sql`SELECT DISTINCT jsonb_array_elements_text(${schema.spawns.biomes}) AS biome FROM ${schema.spawns} ORDER BY biome`,
    );
    return rows.map((r) => r.biome);
  }, [] as string[]),
);
