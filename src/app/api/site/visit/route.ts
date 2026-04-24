import { sql } from "drizzle-orm";
import { db, safe, schema } from "@/lib/db/client";

/**
 * POST increments the site-wide visit counter. Called once per session
 * from the Landing page (client ensures idempotency via sessionStorage).
 * Atomic SQL increment — safe under concurrency.
 */
export async function POST() {
  await safe(async () => {
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
  }, undefined);
  return Response.json({ ok: true });
}
