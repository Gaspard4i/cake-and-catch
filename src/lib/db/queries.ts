import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db, schema } from "./client";

export async function getSpeciesBySlug(slug: string) {
  const rows = await db
    .select()
    .from(schema.species)
    .where(eq(schema.species.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSpawnsForSpecies(speciesId: number) {
  return db
    .select()
    .from(schema.spawns)
    .where(eq(schema.spawns.speciesId, speciesId))
    .orderBy(
      asc(
        sql`case ${schema.spawns.sourceKind} when 'mod' then 0 else 1 end`,
      ),
      desc(schema.spawns.weight),
    );
}

export async function getSourcesFor(entityType: string, entityId: number) {
  return db
    .select()
    .from(schema.dataSources)
    .where(
      and(
        eq(schema.dataSources.entityType, entityType),
        eq(schema.dataSources.entityId, entityId),
      ),
    );
}

export async function searchSpecies(query: string, limit = 20) {
  if (!query) {
    return db.select().from(schema.species).orderBy(asc(schema.species.dexNo)).limit(limit);
  }
  return db
    .select()
    .from(schema.species)
    .where(ilike(schema.species.name, `%${query}%`))
    .orderBy(asc(schema.species.dexNo))
    .limit(limit);
}

export async function countSpecies() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.species);
  return row.count;
}

export async function listBaitEffects() {
  return db.select().from(schema.baitEffects);
}

export async function listSeasonings() {
  return db.select().from(schema.seasonings);
}
