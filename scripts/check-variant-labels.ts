import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const r = (await db.execute(sql`
    SELECT variant_label, count(*)::int AS n
    FROM species WHERE variant_of_species_id IS NOT NULL
    GROUP BY variant_label
    ORDER BY n DESC
  `)) as unknown as Array<{ variant_label: string; n: number }>;
  console.log("variant_label distribution:");
  for (const row of r) console.log(" ", row.variant_label, "→", row.n);
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
