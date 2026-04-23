import { NextRequest } from "next/server";
import {
  listAllSeasonings,
  listBerries,
  listSpawnsWithSpecies,
} from "@/lib/db/queries";
import {
  cakeDominantFlavour,
  cakeEffectTags,
  EFFECT_TAG_LABELS,
  filterSpawns,
  preferredFlavourFor,
  type CakeComposition,
  type SpawnFilter,
} from "@/lib/recommend/snack";
import type { Berry } from "@/lib/db/schema";

type IncomingFilter = Partial<SpawnFilter> & {
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

type SeasoningDTO = {
  slug: string;
  itemId: string;
  kind: "berry" | "other";
  /**
   * Whether the item can actually sit in the flavour_seasoning slot of a PokÃ© Cake.
   * Per upstream data tag `cobblemon:recipe_filters/flavour_seasoning`, only
   * `#cobblemon:berries` qualifies. Everything else in the seasonings/ folder is
   * reserved for other Cooking Pot recipes (PokÃ© Snack, stews, candiesâ€¦).
   */
  cakeValid: boolean;
  category: string;
  colour: string | null;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
  description: string | null;
  effectTags: string[];
  effects: Array<Record<string, unknown>>;
};

function classifySeasoning(
  slug: string,
  raw: Record<string, unknown>,
): {
  category: string;
  description: string;
  effects: Array<Record<string, unknown>>;
} {
  const mobEffects = (raw.mobEffects as Array<Record<string, unknown>>) ?? [];
  const colour = (raw.colour as string) ?? (raw.color as string) ?? "unknown";

  let category = "other";
  if (/sweet$/.test(slug)) category = "Alcremie sweet";
  else if (slug === "chorus_flower" || slug === "chorus_fruit") category = "End";
  else if (slug.endsWith("_tulip") || ["allium", "azure_bluet", "blue_orchid", "cornflower", "dandelion", "oxeye_daisy", "poppy", "sunflower", "torchflower", "lilac", "peony", "rose_bush", "lily_of_the_valley", "pink_petals", "spore_blossom", "pitcher_plant", "wildflowers", "wither_rose"].includes(slug))
    category = "flower";
  else if (slug.endsWith("_mushroom")) category = "mushroom";
  else if (slug.endsWith("_mint_leaf")) category = "mint";
  else if (["apple", "carrot", "beetroot", "potato", "melon_slice", "glistening_melon_slice", "pumpkin", "honey_bottle", "dried_kelp", "sweet_berries", "golden_apple", "enchanted_golden_apple", "golden_carrot", "poisonous_potato"].includes(slug))
    category = "food";
  else if (["beef", "chicken", "cod", "egg", "mutton", "porkchop", "rabbit", "salmon", "rotten_flesh"].includes(slug))
    category = "mob drop";
  else if (["big_root", "energy_root", "revival_herb", "mental_herb", "mirror_herb", "power_herb", "white_herb", "medicinal_leek", "pep_up_flower", "tasty_tail", "galarica_nuts", "vivichoke", "moomoo_milk", "milk_bucket", "sugar", "dead_bush"].includes(slug))
    category = "ingredient";

  const parts: string[] = [];
  parts.push(`Colour: ${colour}.`);
  if (mobEffects.length > 0) {
    const names = mobEffects
      .map((e) => String(e.effect ?? "").replace(/^minecraft:/, ""))
      .filter(Boolean);
    if (names.length > 0)
      parts.push(`Grants potion effect${names.length > 1 ? "s" : ""}: ${names.join(", ")}.`);
  }
  parts.push("Not a valid PokÃ© Cake seasoning â€” used in other Cooking Pot recipes.");

  return { category, description: parts.join(" "), effects: mobEffects };
}

function buildPantry(
  berries: Berry[],
  rawSeasonings: { slug: string; itemId: string; colour: string | null; raw: unknown }[],
): SeasoningDTO[] {
  const berryBySlug = new Map(berries.map((b) => [b.slug, b]));
  const out: SeasoningDTO[] = [];

  for (const berry of berries) {
    out.push({
      slug: berry.slug,
      itemId: berry.itemId,
      kind: "berry",
      cakeValid: true,
      category: "berry",
      colour: berry.colour,
      flavours: berry.flavours,
      dominantFlavour: berry.dominantFlavour,
      description: berry.description,
      effectTags: berry.effectTags ?? [],
      effects: [],
    });
  }
  for (const s of rawSeasonings) {
    if (berryBySlug.has(s.slug)) continue;
    const raw = (s.raw ?? {}) as Record<string, unknown>;
    const meta = classifySeasoning(s.slug, raw);
    out.push({
      slug: s.slug,
      itemId: s.itemId,
      kind: "other",
      cakeValid: false,
      category: meta.category,
      colour: s.colour,
      flavours: {},
      dominantFlavour: null,
      description: meta.description,
      effectTags: [],
      effects: meta.effects,
    });
  }
  return out;
}

function ok(data: unknown) {
  return Response.json(data, {
    headers: { "cache-control": "public, s-maxage=30" },
  });
}

export async function GET() {
  const [berries, seasonings] = await Promise.all([listBerries(), listAllSeasonings()]);
  const pantry = buildPantry(berries, seasonings);
  return ok({
    seasonings: pantry,
    berries: pantry.filter((s) => s.kind === "berry"),
  });
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
  // Only berries actually contribute to cake flavour; silently drop invalid slugs.
  const validSlugs = seasoningSlugs.filter((s) => byslug.has(s));
  const dominant = cakeDominantFlavour({ seasoningSlugs: validSlugs }, byslug);
  const effectTags = cakeEffectTags({ seasoningSlugs: validSlugs }, byslug);
  const effects = effectTags.map((t) => ({
    tag: t,
    ...(EFFECT_TAG_LABELS[t] ?? { title: t, description: "", tone: "utility" }),
  }));

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
    if (dominant && dominant !== targetFlavour) continue;
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

  return ok({
    cake: {
      dominantFlavour: dominant,
      seasoningSlugs: validSlugs,
      colorHint: berries.find((b) => b.slug === validSlugs[0])?.colour ?? null,
      effects,
    },
    filter,
    count: attracted.length,
    attracted: attracted.slice(0, 100),
  });
}
