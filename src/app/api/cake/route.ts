import { NextRequest } from "next/server";
import { listBerries, listSpawnsWithSpecies } from "@/lib/db/queries";
import {
  cakeDominantFlavour,
  filterSpawns,
  preferredFlavourFor,
  type CakeComposition,
  type SpawnFilter,
} from "@/lib/recommend/cake";
import type { Berry } from "@/lib/db/schema";

type IncomingFilter = Partial<SpawnFilter> & {
  // Back-compat: accept old single-value shape
  biome?: string;
  timeRange?: string;
};

type Body = {
  composition?: CakeComposition;
  filter?: IncomingFilter;
};

function normalizeFilter(raw: IncomingFilter | undefined): SpawnFilter {
  const out: SpawnFilter = {};
  if (raw?.biomes && raw.biomes.length > 0) out.biomes = raw.biomes;
  else if (raw?.biome) out.biomes = [raw.biome];
  if (raw?.timeRanges && raw.timeRanges.length > 0) out.timeRanges = raw.timeRanges;
  else if (raw?.timeRange) out.timeRanges = [raw.timeRange];
  if (typeof raw?.minY === "number") out.minY = raw.minY;
  if (typeof raw?.maxY === "number") out.maxY = raw.maxY;
  if (raw?.weather) out.weather = raw.weather;
  return out;
}

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const seasoningSlugs = (body.composition?.seasoningSlugs ?? []).slice(0, 3);
  const filter: SpawnFilter = normalizeFilter(body.filter);

  const berries = await listBerries();
  const byslug = new Map<string, Berry>(berries.map((b) => [b.slug, b]));
  const dominant = cakeDominantFlavour({ seasoningSlugs }, byslug);

  const spawns = await listSpawnsWithSpecies(10000);
  const matchingSpawns = filterSpawns(spawns, filter);

  type Candidate = (typeof matchingSpawns)[number];
  const bySpecies = new Map<number, Candidate[]>();
  for (const s of matchingSpawns) {
    const arr = bySpecies.get(s.speciesId) ?? [];
    arr.push(s);
    bySpecies.set(s.speciesId, arr);
  }

  const attracted: Array<{
    speciesId: number;
    slug: string;
    name: string;
    dexNo: number;
    primaryType: string;
    secondaryType: string | null;
    matchedFlavour: string;
    spawnCount: number;
    bestBucket: string;
    bestWeight: number;
  }> = [];

  for (const [speciesId, entries] of bySpecies) {
    const first = entries[0];
    const targetFlavour = preferredFlavourFor(first);
    if (dominant && dominant !== targetFlavour) continue; // cake mismatch filters out
    const best = entries.reduce((a, b) => (b.weight > a.weight ? b : a));
    attracted.push({
      speciesId,
      slug: first.slug,
      name: first.name,
      dexNo: first.dexNo,
      primaryType: first.primaryType,
      secondaryType: first.secondaryType,
      matchedFlavour: dominant ?? targetFlavour,
      spawnCount: entries.length,
      bestBucket: best.bucket,
      bestWeight: best.weight,
    });
  }

  attracted.sort((a, b) => b.bestWeight - a.bestWeight);

  return Response.json(
    {
      cake: {
        dominantFlavour: dominant,
        seasoningSlugs,
        colorHint: berries.find((b) => b.slug === seasoningSlugs[0])?.colour ?? null,
      },
      filter,
      count: attracted.length,
      attracted: attracted.slice(0, 100),
    },
    {
      headers: { "cache-control": "public, s-maxage=30" },
    },
  );
}

export async function GET() {
  const berries = await listBerries();
  return Response.json({
    berries: berries.map((b) => ({
      slug: b.slug,
      itemId: b.itemId,
      colour: b.colour,
      flavours: b.flavours,
      dominantFlavour: b.dominantFlavour,
      description: b.description,
    })),
  });
}
