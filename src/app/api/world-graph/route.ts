import { db, schema } from "@/lib/db/client";
import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

/**
 * Single source of truth for the snack-maker filter cascade. The
 * client downloads it once and intersects locally — picking a mod
 * narrows the dimension list, a dimension narrows the biome list, a
 * biome narrows the structure list, and so on.
 *
 * Authored content seeded by `pnpm ingest:world`. Refresh after every
 * spawn ingest so newly seen biomes get auto-bucketed.
 */
export type WorldGraph = {
  mods: Array<{ id: string; label: string; locked: boolean; sortOrder: number }>;
  dimensions: Array<{
    modId: string;
    id: string;
    label: string;
    hasDayCycle: boolean;
    hasWeather: boolean;
    hasMoon: boolean;
    hasSky: boolean;
    sortOrder: number;
  }>;
  biomes: Array<{
    dimensionId: string;
    id: string;
    label: string;
    section: string | null;
    sortOrder: number;
  }>;
  structures: Array<{ biomeId: string; id: string; label: string }>;
};

const fetchGraph = unstable_cache(
  async (): Promise<WorldGraph> => {
    const [mods, dims, biomes, structures] = await Promise.all([
      db
        .select()
        .from(schema.mods)
        .orderBy(asc(schema.mods.sortOrder), asc(schema.mods.id)),
      db
        .select()
        .from(schema.modDimensions)
        .orderBy(asc(schema.modDimensions.sortOrder), asc(schema.modDimensions.dimensionId)),
      db
        .select()
        .from(schema.dimensionBiomes)
        .orderBy(asc(schema.dimensionBiomes.sortOrder), asc(schema.dimensionBiomes.biomeId)),
      db.select().from(schema.biomeStructures),
    ]);
    return {
      mods: mods.map((m) => ({
        id: m.id,
        label: m.label,
        locked: m.locked === 1,
        sortOrder: m.sortOrder,
      })),
      dimensions: dims.map((d) => ({
        modId: d.modId,
        id: d.dimensionId,
        label: d.label,
        hasDayCycle: d.hasDayCycle === 1,
        hasWeather: d.hasWeather === 1,
        hasMoon: d.hasMoon === 1,
        hasSky: d.hasSky === 1,
        sortOrder: d.sortOrder,
      })),
      biomes: biomes.map((b) => ({
        dimensionId: b.dimensionId,
        id: b.biomeId,
        label: b.label,
        section: b.section,
        sortOrder: b.sortOrder,
      })),
      structures: structures.map((s) => ({
        biomeId: s.biomeId,
        id: s.structureId,
        label: s.label,
      })),
    };
  },
  ["world-graph"],
  { revalidate: 6 * 3600, tags: ["world-graph"] },
);

export async function GET() {
  const graph = await fetchGraph();
  return Response.json(graph, {
    headers: {
      "cache-control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
