import { revalidateTag } from "next/cache";

const TAGS = [
  "berries",
  "seasonings",
  "seasonings-all",
  "bait-effects",
  "core-recipes",
  "spawns-with-species",
  "spawns-for-biome",
  "distinct-biomes",
  "source-names",
  "count-species",
  "species-by-slug",
  "spawns-for-species",
  "sources-for",
  "wiki-summary",
  "recipe-by-slug",
];

/**
 * One-shot cache purge for the read-only DB layer. Used after a data
 * migration or ingest run to evict stale entries from the Vercel Data Cache
 * without waiting for the natural revalidate window. Token-gated to avoid
 * abuse — set CACHE_PURGE_TOKEN in Vercel project env.
 */
export async function POST(request: Request) {
  const expected = process.env.CACHE_PURGE_TOKEN;
  if (!expected) {
    return Response.json({ error: "CACHE_PURGE_TOKEN not configured" }, { status: 500 });
  }
  const token = request.headers.get("x-purge-token");
  if (token !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  for (const tag of TAGS) {
    revalidateTag(tag);
  }
  return Response.json({ purged: TAGS });
}
