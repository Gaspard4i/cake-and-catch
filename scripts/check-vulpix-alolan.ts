import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";
async function main() {
  const r = (await db.execute(sql`
    SELECT slug, name, variant_of_species_id, variant_label, labels
    FROM species
    WHERE slug = 'vulpix-alolan'
  `)) as unknown as Array<Record<string, unknown>>;
  console.log(r);
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
