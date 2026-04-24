import { eq } from "drizzle-orm";
import { db, isDbMissing, schema } from "@/lib/db/client";

/**
 * Returns aggregated site stats for the home page counter. Cache 30s on
 * the CDN. Any failure (table missing, DB down, network glitch) returns
 * zeros instead of a 500 — the badge is a nice-to-have, not a hard
 * requirement for the page to load.
 */
export async function GET() {
  if (isDbMissing()) {
    return Response.json(emptyStats());
  }
  try {
    const rows = await db
      .select()
      .from(schema.siteStats)
      .where(eq(schema.siteStats.id, 1))
      .limit(1);
    const row = rows[0];
    const visits = row?.visits ?? 0;
    const ratingCount = row?.ratingCount ?? 0;
    const ratingSum = row?.ratingSum ?? 0;
    const average = ratingCount > 0 ? ratingSum / ratingCount : 0;
    return Response.json(
      { visits, ratingCount, ratingAverage: Number(average.toFixed(2)) },
      { headers: { "cache-control": "public, s-maxage=30" } },
    );
  } catch (err) {
    console.warn("[site/stats] query failed:", err instanceof Error ? err.message : err);
    return Response.json(emptyStats());
  }
}

function emptyStats() {
  return { visits: 0, ratingCount: 0, ratingAverage: 0 };
}
