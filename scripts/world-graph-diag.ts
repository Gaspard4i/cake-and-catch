import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const queries = [
    ["mods", sql`SELECT count(*)::int AS n FROM mods`],
    ["dimensions", sql`SELECT count(*)::int AS n FROM dimensions`],
    ["biome_tags", sql`SELECT count(*)::int AS n FROM biome_tags`],
    ["biome_tag_members", sql`SELECT count(*)::int AS n FROM biome_tag_members`],
    ["structures", sql`SELECT count(*)::int AS n FROM structures`],
    ["biome_tag_structures", sql`SELECT count(*)::int AS n FROM biome_tag_structures`],
    ["species (incl. variants)", sql`SELECT count(*)::int AS n FROM species`],
    [
      "species variants only",
      sql`SELECT count(*)::int AS n FROM species WHERE variant_of_species_id IS NOT NULL`,
    ],
    ["spawns", sql`SELECT count(*)::int AS n FROM spawns`],
    [
      "spawns by source",
      sql`SELECT source_name, count(*)::int AS n FROM spawns GROUP BY source_name ORDER BY n DESC`,
    ],
    [
      "tags per dimension",
      sql`SELECT dimension_id, count(*)::int AS n FROM biome_tags GROUP BY dimension_id ORDER BY n DESC`,
    ],
    [
      "spawns with non-empty condition_dimensions",
      sql`SELECT count(*)::int AS n FROM spawns WHERE jsonb_array_length(condition_dimensions) > 0`,
    ],
  ] as const;
  for (const entry of queries) {
    const [label, q] = entry as readonly [string, ReturnType<typeof sql>];
    const r = (await db.execute(q)) as unknown as Array<Record<string, unknown>>;
    console.log(label, "→", r);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
