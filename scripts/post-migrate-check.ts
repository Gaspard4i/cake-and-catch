import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const tables = (await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' ORDER BY table_name
  `)) as unknown as Array<{ table_name: string }>;
  console.log("Tables (" + tables.length + "):");
  for (const r of tables) console.log(" ", r.table_name);

  const cols = (await db.execute(sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='spawns'
    ORDER BY ordinal_position
  `)) as unknown as Array<{ column_name: string; data_type: string }>;
  console.log("\nspawns columns (" + cols.length + "):");
  for (const r of cols) console.log("  " + r.column_name + " :: " + r.data_type);
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
