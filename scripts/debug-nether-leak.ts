import { db, schema } from "../src/lib/db/client";
import { eq, sql } from "drizzle-orm";

async function main() {
  // Find every Ducklett spawn — what's its biome?
  const slugs = ["ducklett", "wooper", "nacli", "glimmet", "swanna", "glimmora", "clodsire", "naclstack", "garganacl"];
  for (const slug of slugs) {
    const r = await db.execute(sql`
      SELECT s.external_id, s.source_name, s.biomes, s.condition->'dimensions' AS dims
      FROM spawns s INNER JOIN species sp ON sp.id = s.species_id
      WHERE sp.slug = ${slug}
    `);
    const rows = (r as { rows?: unknown[] }).rows ?? [];
    console.log(slug, ":", JSON.stringify(rows));
  }
  void schema;
  void eq;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
