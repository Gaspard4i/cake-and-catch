import { listSourceNames } from "@/lib/db/queries";

/**
 * Distinct spawn-pool source names (cobblemon, mysticmons, …). Used by
 * the snack maker so the user can scope which datapacks contribute
 * spawns to the attracted-cobblemon ranking.
 */
export async function GET() {
  const names = await listSourceNames();
  return Response.json(
    { sources: names },
    { headers: { "cache-control": "public, s-maxage=300" } },
  );
}
