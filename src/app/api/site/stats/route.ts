import { eq } from "drizzle-orm";
import { db, safe, schema } from "@/lib/db/client";

/**
 * Returns aggregated site stats for the home page counter. Cache 30s on
 * the CDN so the badge doesn't hammer the DB on every home visit.
 */
export async function GET() {
  const row = await safe(
    async () => {
      const rows = await db
        .select()
        .from(schema.siteStats)
        .where(eq(schema.siteStats.id, 1))
        .limit(1);
      return rows[0];
    },
    undefined,
  );
  const visits = row?.visits ?? 0;
  const ratingCount = row?.ratingCount ?? 0;
  const ratingSum = row?.ratingSum ?? 0;
  const average = ratingCount > 0 ? ratingSum / ratingCount : 0;
  return Response.json(
    { visits, ratingCount, ratingAverage: Number(average.toFixed(2)) },
    { headers: { "cache-control": "public, s-maxage=30" } },
  );
}
