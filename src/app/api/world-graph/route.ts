import { db, schema } from "@/lib/db/client";
import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";

/**
 * Single source of truth for the snack-maker filter cascade. The
 * client downloads it once and intersects locally — picking a mod
 * narrows the dimension list, picking a dimension narrows the biome
 * list, picking a biome narrows the structure list.
 *
 * Authored content seeded by `pnpm ingest:reset`. Refresh after every
 * spawn ingest so newly seen biomes / structures get auto-bucketed.
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
  biomeTags: Array<{
    id: string;
    label: string;
    dimensionId: string | null;
    section: string | null;
    sortOrder: number;
  }>;
  biomeTagMembers: Array<{ tagId: string; biomeId: string }>;
  structures: Array<{ id: string; label: string; sortOrder: number }>;
  biomeTagStructures: Array<{ biomeTagId: string; structureId: string }>;
};

const fetchGraph = unstable_cache(
  async (): Promise<WorldGraph> => {
    const [mods, dims, tags, members, structs, links] = await Promise.all([
      db.select().from(schema.mods).orderBy(asc(schema.mods.sortOrder), asc(schema.mods.id)),
      db
        .select()
        .from(schema.dimensions)
        .orderBy(asc(schema.dimensions.sortOrder), asc(schema.dimensions.id)),
      db
        .select()
        .from(schema.biomeTags)
        .orderBy(asc(schema.biomeTags.sortOrder), asc(schema.biomeTags.id)),
      db.select().from(schema.biomeTagMembers),
      db
        .select()
        .from(schema.structures)
        .orderBy(asc(schema.structures.sortOrder), asc(schema.structures.id)),
      db.select().from(schema.biomeTagStructures),
    ]);
    return {
      mods: mods.map((m) => ({
        id: m.id,
        label: m.label,
        locked: m.locked,
        sortOrder: m.sortOrder,
      })),
      dimensions: dims.map((d) => ({
        modId: d.modId,
        id: d.id,
        label: d.label,
        hasDayCycle: d.hasDayCycle,
        hasWeather: d.hasWeather,
        hasMoon: d.hasMoon,
        hasSky: d.hasSky,
        sortOrder: d.sortOrder,
      })),
      biomeTags: tags.map((t) => ({
        id: t.id,
        label: t.label,
        dimensionId: t.dimensionId,
        section: t.section,
        sortOrder: t.sortOrder,
      })),
      biomeTagMembers: members.map((m) => ({ tagId: m.tagId, biomeId: m.biomeId })),
      structures: structs.map((s) => ({
        id: s.id,
        label: s.label,
        sortOrder: s.sortOrder,
      })),
      biomeTagStructures: links.map((l) => ({
        biomeTagId: l.biomeTagId,
        structureId: l.structureId,
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
