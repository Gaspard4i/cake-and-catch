import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const r = (await db.execute(sql`
    SELECT count(*)::int AS n, count(DISTINCT tag_id)::int AS tags
    FROM biome_tag_members
  `)) as unknown as Array<{ n: number; tags: number }>;
  console.log("totals:", r[0]);
  const top = (await db.execute(sql`
    SELECT tag_id, count(*)::int AS n
    FROM biome_tag_members
    GROUP BY tag_id
    ORDER BY n DESC
    LIMIT 5
  `)) as unknown as Array<{ tag_id: string; n: number }>;
  console.log("top:", top);
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
