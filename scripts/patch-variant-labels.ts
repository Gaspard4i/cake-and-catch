import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

/**
 * Re-assign synthetic `variant` and `regional` labels on the species
 * table. Run after any change to the regional-variant heuristic in
 * `ingest/reset.ts` — keeps the existing data in sync without a full
 * re-ingest.
 *
 * `variant` = any non-base form
 * `regional` = alolan / galarian / hisuian / paldean (and sub-forms
 *              like paldean-combat, paldean-aqua, paldean-blaze)
 */
async function main() {
  // Strip both labels first so we don't keep stale entries.
  await db.execute(sql`
    UPDATE species
    SET labels = (
      SELECT coalesce(jsonb_agg(value), '[]'::jsonb)
      FROM jsonb_array_elements_text(labels) AS value
      WHERE value NOT IN ('regional', 'variant')
    )
    WHERE variant_of_species_id IS NOT NULL
  `);

  // Re-add `variant` to every variant row.
  const v = (await db.execute(sql`
    UPDATE species
    SET labels = labels || '["variant"]'::jsonb
    WHERE variant_of_species_id IS NOT NULL
    RETURNING id
  `)) as unknown as Array<{ id: number }>;

  // Re-add `regional` only when the variant_label starts with a
  // regional prefix.
  const r = (await db.execute(sql`
    UPDATE species
    SET labels = labels || '["regional"]'::jsonb
    WHERE variant_of_species_id IS NOT NULL
      AND (
        variant_label ILIKE 'alolan%'
        OR variant_label ILIKE 'galarian%'
        OR variant_label ILIKE 'hisuian%'
        OR variant_label ILIKE 'paldean%'
      )
    RETURNING id
  `)) as unknown as Array<{ id: number }>;

  console.log(`tagged ${v.length} variants with 'variant'`);
  console.log(`tagged ${r.length} variants with 'regional'`);
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
