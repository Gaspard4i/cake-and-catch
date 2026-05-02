import { db, schema } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

/**
 * Compact projection of every spawn used by the snack/bait filter
 * cascade. The client downloads this once and intersects the relevant
 * axes locally so picking a dimension narrows the biome picker, picking
 * a biome narrows the time picker, etc. The payload stays small (~6k
 * rows × small JSON) and is cached aggressively.
 */
export type SpawnAxis = {
  /** Source name, e.g. "cobblemon" or an addon slug. */
  src: string;
  /** Bucket — common / uncommon / rare / ultra-rare. */
  bk: string;
  /** Spawnable position type (grounded/surface/submerged/seafloor/lavafloor/fishing). */
  ctx: string | null;
  /** Spawn biome list (already deduped + lowercased). */
  bio: string[];
  /** Dimensions list from condition.dimensions; empty when unconstrained. */
  dim: string[];
  /** Structures from condition.structures; empty when unconstrained. */
  str: string[];
  /** condition.timeRange or null. */
  tr: string | null;
  /** Numeric moonPhase 0–7 if pinned, else null. */
  mp: number | null;
  /**
   * Weather flags. `r` = isRaining, `th` = isThundering, both either
   * boolean (mandatory state) or null (unconstrained).
   */
  r: boolean | null;
  th: boolean | null;
  /** canSeeSky boolean or null. */
  sky: boolean | null;
  /** [minLight, maxLight] when present, else null. */
  light: [number, number] | null;
  /** [minSkyLight, maxSkyLight] when present, else null. */
  slight: [number, number] | null;
};

const fetchAxes = unstable_cache(
  async (): Promise<SpawnAxis[]> => {
    const rows = await db
      .select({
        sourceName: schema.spawns.sourceName,
        bucket: schema.spawns.bucket,
        context: schema.spawns.context,
        biomes: schema.spawns.biomes,
        condition: schema.spawns.condition,
      })
      .from(schema.spawns);

    return rows.map((r) => {
      const cond = (r.condition ?? {}) as Record<string, unknown>;
      const num = (v: unknown): number | null =>
        typeof v === "number" && Number.isFinite(v) ? v : null;
      const bool = (v: unknown): boolean | null =>
        typeof v === "boolean" ? v : null;
      const arr = (v: unknown): string[] =>
        Array.isArray(v) ? (v as string[]) : [];
      const minLight = num(cond.minLight);
      const maxLight = num(cond.maxLight);
      const minSky = num(cond.minSkyLight);
      const maxSky = num(cond.maxSkyLight);
      const moon =
        typeof cond.moonPhase === "number"
          ? cond.moonPhase
          : typeof cond.moonPhase === "string"
            ? Number.parseInt(cond.moonPhase, 10)
            : null;
      return {
        src: r.sourceName,
        bk: r.bucket,
        ctx: r.context,
        bio: r.biomes ?? [],
        dim: arr(cond.dimensions),
        str: arr(cond.structures),
        tr: typeof cond.timeRange === "string" ? cond.timeRange : null,
        mp: Number.isFinite(moon as number) ? (moon as number) : null,
        r: bool(cond.isRaining),
        th: bool(cond.isThundering),
        sky: bool(cond.canSeeSky),
        light: minLight !== null || maxLight !== null
          ? [minLight ?? 0, maxLight ?? 15]
          : null,
        slight: minSky !== null || maxSky !== null
          ? [minSky ?? 0, maxSky ?? 15]
          : null,
      };
    });
  },
  ["spawn-axes"],
  { revalidate: 6 * 3600, tags: ["spawn-axes"] },
);

export async function GET() {
  const axes = await fetchAxes();
  return Response.json(
    { axes },
    {
      headers: {
        "cache-control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
