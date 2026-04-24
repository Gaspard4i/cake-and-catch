import { sql } from "drizzle-orm";
import { db, isDbMissing, schema } from "@/lib/db/client";

/**
 * Atomic increment of the site-wide visit counter. Called once per tab
 * session from the Landing page. Best-effort: if the DB is unavailable
 * or the table is missing, we swallow the error — the counter is not
 * critical to the user experience.
 */
export async function POST() {
  if (isDbMissing()) return Response.json({ ok: true });
  try {
    await db
      .insert(schema.siteStats)
      .values({ id: 1, visits: 1 })
      .onConflictDoUpdate({
        target: schema.siteStats.id,
        set: {
          visits: sql`${schema.siteStats.visits} + 1`,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.warn("[site/visit] failed:", err instanceof Error ? err.message : err);
  }
  return Response.json({ ok: true });
}
