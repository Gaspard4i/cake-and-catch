import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const r = await db.execute(sql`
    SELECT count(*)::int AS n FROM species
    WHERE slug ILIKE '%-alolan%' OR slug ILIKE '%-galarian%'
       OR slug ILIKE '%-hisuian%' OR slug ILIKE '%-paldean%'
       OR slug ILIKE 'alolan-%' OR slug ILIKE 'galarian-%'
       OR slug ILIKE 'hisuian-%' OR slug ILIKE 'paldean-%'
  `);
  console.log("regional variant species (slug pattern):", (r as { rows?: unknown[] }).rows ?? r);
  const r2 = await db.execute(sql`
    SELECT slug, name FROM species WHERE slug ILIKE '%vulpix%'
       OR slug ILIKE '%slowpoke%' OR slug ILIKE '%tauros%' OR slug ILIKE '%meowth%'
       OR slug ILIKE '%zorua%' OR slug ILIKE '%growlithe%'
  `);
  console.log("name family check:", (r2 as { rows?: unknown[] }).rows ?? r2);
  const r3 = await db.execute(sql`
    SELECT slug, jsonb_typeof(raw->'forms') AS forms_t FROM species
    WHERE raw->'forms' IS NOT NULL LIMIT 5
  `);
  console.log("species.raw.forms sample:", (r3 as { rows?: unknown[] }).rows ?? r3);
  // How does Cobblemon mark a Pokemon's regional aspect on a spawn?
  const r4 = await db.execute(sql`
    SELECT external_id, condition->'aspects' AS aspects, condition->'labels' AS labels
    FROM spawns WHERE condition->'labels' ?| array['alolan','galarian','hisuian','paldean']
       OR condition->'aspects' IS NOT NULL
    LIMIT 5
  `);
  console.log("spawns referring to regional labels:", (r4 as { rows?: unknown[] }).rows ?? r4);
  const r5 = await db.execute(sql`
    SELECT raw->'forms' AS forms FROM species WHERE slug = 'vulpix'
  `);
  console.log("vulpix forms:", JSON.stringify((r5 as { rows?: unknown[] }).rows?.[0] ?? r5, null, 2));
  // Spawns whose pokemon string mentions an aspect
  const r6 = await db.execute(sql`
    SELECT external_id, pokemon FROM (
      SELECT s.external_id, raw_spawn->>'pokemon' AS pokemon
      FROM spawns s, jsonb_each(s.condition) AS x WHERE FALSE
    ) AS t
    LIMIT 0
  `);
  void r6;
  // Better: peek at how spawns reference Vulpix-Alolan. The `pokemon`
  // field is in the spawn entry JSON which is NOT stored separately;
  // we'd need to look at the raw upstream. But spawns under externalId
  // patterns like `vulpix-alolan-1` are a hint.
  const r7 = await db.execute(sql`
    SELECT DISTINCT external_id FROM spawns WHERE external_id ILIKE '%alolan%' OR external_id ILIKE '%galarian%' OR external_id ILIKE '%hisuian%' OR external_id ILIKE '%paldean%' LIMIT 20
  `);
  console.log("spawns with regional id:", (r7 as { rows?: unknown[] }).rows ?? r7);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
