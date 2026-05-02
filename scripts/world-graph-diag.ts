import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const results = await Promise.all([
    db.execute(sql`SELECT count(*)::int AS n FROM mods`),
    db.execute(sql`SELECT count(*)::int AS n FROM mod_dimensions`),
    db.execute(sql`SELECT count(*)::int AS n FROM dimension_biomes`),
    db.execute(sql`SELECT count(*)::int AS n FROM biome_structures`),
    db.execute(
      sql`SELECT dimension_id, count(*)::int AS n FROM dimension_biomes GROUP BY dimension_id ORDER BY n DESC`,
    ),
    db.execute(
      sql`SELECT mod_id, count(*)::int AS n FROM mod_dimensions GROUP BY mod_id ORDER BY n DESC`,
    ),
  ]);
  for (const r of results) {
    console.log((r as unknown as { rows?: unknown }).rows ?? r);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
