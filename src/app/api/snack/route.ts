import { NextRequest } from "next/server";
import {
  listAllSeasonings,
  listBaitEffects,
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
import {
  BAIT_VANILLA_ITEMS,
  formatBaitEffects,
  type FormattedBaitEffect,
  type RawBaitEffect,
} from "@/lib/recommend/bait-effects";
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
   * Whether this item can actually sit in a Poké Snack / Poké Bait seasoning
   * slot. Corresponds to `cobblemon:recipe_filters/bait_seasoning` upstream —
   * any berry OR one of 7 vanilla items (apple, golden apple, enchanted golden
   * apple, glistering melon slice, golden carrot, sweet berries, glow berries).
   */
  snackValid: boolean;
  category: string;
  colour: string | null;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
  description: string | null;
  effectTags: string[];
  /** Cooked raw JSON from spawn_bait_effects/; empty when not a bait item. */
  rawBaitEffects: RawBaitEffect[];
  /** Human-readable effects ready for UI display. */
  baitEffects: FormattedBaitEffect[];
};

function classifySeasoning(
  slug: string,
  raw: Record<string, unknown>,
): {
  category: string;
  description: string;
} {
  const colour = (raw.colour as string) ?? (raw.color as string) ?? "unknown";

  let category = "other";
  if (/sweet$/.test(slug)) category = "Alcremie sweet";
  else if (slug === "chorus_flower" || slug === "chorus_fruit") category = "End";
  else if (
    slug.endsWith("_tulip") ||
    [
      "allium",
      "azure_bluet",
      "blue_orchid",
      "cornflower",
      "dandelion",
      "oxeye_daisy",
      "poppy",
      "sunflower",
      "torchflower",
      "lilac",
      "peony",
      "rose_bush",
      "lily_of_the_valley",
      "pink_petals",
      "spore_blossom",
      "pitcher_plant",
      "wildflowers",
      "wither_rose",
    ].includes(slug)
  )
    category = "flower";
  else if (slug.endsWith("_mushroom")) category = "mushroom";
  else if (slug.endsWith("_mint_leaf")) category = "mint";
  else if (
    [
      "apple",
      "carrot",
      "beetroot",
      "potato",
      "melon_slice",
      "glistening_melon_slice",
      "pumpkin",
      "honey_bottle",
      "dried_kelp",
      "sweet_berries",
      "glow_berries",
      "golden_apple",
      "enchanted_golden_apple",
      "golden_carrot",
      "poisonous_potato",
    ].includes(slug)
  )
    category = "food";
  else if (
    [
      "beef",
      "chicken",
      "cod",
      "egg",
      "mutton",
      "porkchop",
      "rabbit",
      "salmon",
      "rotten_flesh",
    ].includes(slug)
  )
    category = "mob drop";
  else if (
    [
      "big_root",
      "energy_root",
      "revival_herb",
      "mental_herb",
      "mirror_herb",
      "power_herb",
      "white_herb",
      "medicinal_leek",
      "pep_up_flower",
      "tasty_tail",
      "galarica_nuts",
      "vivichoke",
      "moomoo_milk",
      "milk_bucket",
      "sugar",
      "dead_bush",
    ].includes(slug)
  )
    category = "ingredient";

  const parts: string[] = [`Colour: ${colour}.`];
  return { category, description: parts.join(" ") };
}

type RawSeasoningRow = {
  slug: string;
  itemId: string;
  colour: string | null;
  raw: unknown;
};

type RawBaitEffectRow = {
  itemId: string;
  effects: RawBaitEffect[];
};

function buildPantry(
  berries: Berry[],
  rawSeasonings: RawSeasoningRow[],
  baitEffectsByItem: Map<string, RawBaitEffect[]>,
): SeasoningDTO[] {
  const berryBySlug = new Map(berries.map((b) => [b.slug, b]));
  const out: SeasoningDTO[] = [];

  for (const berry of berries) {
    const raw = baitEffectsByItem.get(berry.itemId) ?? [];
    out.push({
      slug: berry.slug,
      itemId: berry.itemId,
      kind: "berry",
      snackValid: true, // every berry is in #cobblemon:berries ⊂ bait_seasoning
      category: "berry",
      colour: berry.colour,
      flavours: berry.flavours,
      dominantFlavour: berry.dominantFlavour,
      description: berry.description,
      effectTags: berry.effectTags ?? [],
      rawBaitEffects: raw,
      baitEffects: formatBaitEffects(raw),
    });
  }
  for (const s of rawSeasonings) {
    if (berryBySlug.has(s.slug)) continue;
    const rawJson = (s.raw ?? {}) as Record<string, unknown>;
    const meta = classifySeasoning(s.slug, rawJson);
    const baitRaw = baitEffectsByItem.get(s.itemId) ?? [];
    const isSnackValid = BAIT_VANILLA_ITEMS.has(s.itemId);
    out.push({
      slug: s.slug,
      itemId: s.itemId,
      kind: "other",
      snackValid: isSnackValid,
      category: meta.category,
      colour: s.colour,
      flavours: {},
      dominantFlavour: null,
      description: meta.description,
      effectTags: [],
      rawBaitEffects: baitRaw,
      baitEffects: formatBaitEffects(baitRaw),
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
  const [berries, seasonings, rawBaits] = await Promise.all([
    listBerries(),
    listAllSeasonings(),
    listBaitEffects(),
  ]);
  const baitByItem = new Map<string, RawBaitEffect[]>();
  for (const b of rawBaits as RawBaitEffectRow[]) {
    baitByItem.set(b.itemId, b.effects as RawBaitEffect[]);
  }
  const pantry = buildPantry(berries, seasonings, baitByItem);
  return ok({
    seasonings: pantry,
    berries: pantry.filter((s) => s.kind === "berry"),
    // Everything legally usable in a Poké Snack / Poké Bait slot.
    snackSeasonings: pantry.filter((s) => s.snackValid),
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

  const [berries, rawBaits] = await Promise.all([listBerries(), listBaitEffects()]);
  const byslug = new Map<string, Berry>(berries.map((b) => [b.slug, b]));
  const baitByItem = new Map<string, RawBaitEffect[]>();
  for (const b of rawBaits as RawBaitEffectRow[]) {
    baitByItem.set(b.itemId, b.effects as RawBaitEffect[]);
  }

  // Berries contribute to the cake-flavour lookup (UI convenience);
  // silently drop unknown slugs.
  const validSlugs = seasoningSlugs.filter((s) => byslug.has(s));
  const dominant = cakeDominantFlavour({ seasoningSlugs: validSlugs }, byslug);
  const effectTags = cakeEffectTags({ seasoningSlugs: validSlugs }, byslug);
  const holdEffects = effectTags.map((t) => ({
    tag: t,
    ...(EFFECT_TAG_LABELS[t] ?? { title: t, description: "", tone: "utility" }),
  }));

  // Aggregate bait-seasoning effects across placed seasonings.
  const baitEffects: FormattedBaitEffect[] = [];
  for (const slug of validSlugs) {
    const berry = byslug.get(slug);
    if (!berry) continue;
    const raw = baitByItem.get(berry.itemId) ?? [];
    baitEffects.push(...formatBaitEffects(raw));
  }

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
      effects: holdEffects,
    },
    snack: {
      seasoningSlugs: validSlugs,
      baitEffects,
    },
    filter,
    count: attracted.length,
    attracted: attracted.slice(0, 100),
  });
}
