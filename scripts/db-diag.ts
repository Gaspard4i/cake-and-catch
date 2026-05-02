import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const queries = [
    ["spawns total", sql`SELECT count(*)::int AS n FROM spawns`],
    ["species total", sql`SELECT count(*)::int AS n FROM species`],
    [
      "inner join total",
      sql`SELECT count(*)::int AS n FROM spawns s INNER JOIN species sp ON sp.id = s.species_id`,
    ],
    [
      "orphan spawns (FK should prevent these)",
      sql`SELECT count(*)::int AS n FROM spawns s LEFT JOIN species sp ON sp.id = s.species_id WHERE sp.id IS NULL`,
    ],
    [
      "nether-biome spawns",
      sql`SELECT count(*)::int AS n FROM spawns WHERE biomes::text LIKE '%nether%'`,
    ],
    [
      "cobblemon source spawns",
      sql`SELECT count(*)::int AS n FROM spawns WHERE source_name = 'cobblemon'`,
    ],
    [
      "cobblemon source nether-biome spawns",
      sql`SELECT count(*)::int AS n FROM spawns WHERE source_name = 'cobblemon' AND biomes::text LIKE '%nether%'`,
    ],
    [
      "spawns by source",
      sql`SELECT source_name, count(*)::int AS n FROM spawns GROUP BY source_name ORDER BY n DESC`,
    ],
  ] as const;
  for (const entry of queries) {
    const [label, q] = entry as readonly [string, ReturnType<typeof sql>];
    const r = await db.execute(q);
    console.log(`${label}:`, (r as unknown as { rows?: unknown }).rows ?? r);
  }
}

main()
  .then(async () => {
    // Replicate listSpawnsWithSpecies via the actual Drizzle path.
    const { schema } = await import("../src/lib/db/client");
    const { eq, sql: dsql } = await import("drizzle-orm");
    const rows = await db
      .select({
        spawnId: schema.spawns.id,
        biomes: schema.spawns.biomes,
        eggGroups: dsql<string[]>`coalesce(${schema.species.raw} -> 'eggGroups', '[]'::jsonb)`,
      })
      .from(schema.spawns)
      .innerJoin(schema.species, eq(schema.species.id, schema.spawns.speciesId))
      .limit(10000);
    console.log("Drizzle .select.innerJoin.limit(10000):", rows.length);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
