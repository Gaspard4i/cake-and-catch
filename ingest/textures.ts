import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { db, schema } from "../src/lib/db/client";

const MC_VERSION = "1.21.4";
const PUBLIC_DIR = join(process.cwd(), "public", "textures");

const UA = "cake-and-catch/0.1";

async function ensureDir(p: string) {
  await mkdir(dirname(p), { recursive: true });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchTo(url: string, out: string): Promise<"ok" | "missing" | "cached"> {
  if (await fileExists(out)) return "cached";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 404) return "missing";
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await ensureDir(out);
  await writeFile(out, buf);
  return "ok";
}

async function fetchMinecraftItems(names: string[]) {
  console.log(`[textures:mc] ${names.length} items`);
  let ok = 0;
  let cached = 0;
  let missing = 0;
  for (const name of names) {
    try {
      const url = `https://mcasset.cloud/${MC_VERSION}/assets/minecraft/textures/item/${name}.png`;
      const out = join(PUBLIC_DIR, "minecraft", "item", `${name}.png`);
      const res = await fetchTo(url, out);
      if (res === "ok") ok++;
      else if (res === "cached") cached++;
      else missing++;
    } catch (err) {
      console.warn(`[textures:mc] ${name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[textures:mc] ok=${ok} cached=${cached} missing=${missing}`);
}

async function fetchCobblemonItem(relativePath: string) {
  const url = `https://gitlab.com/cable-mc/cobblemon/-/raw/main/common/src/main/resources/assets/cobblemon/textures/item/${relativePath}`;
  const out = join(PUBLIC_DIR, "cobblemon", "item", relativePath);
  return fetchTo(url, out);
}

async function fetchCobblemonItems(paths: string[]) {
  console.log(`[textures:cobblemon] ${paths.length} items`);
  let ok = 0;
  let cached = 0;
  let missing = 0;
  for (const p of paths) {
    try {
      const res = await fetchCobblemonItem(p);
      if (res === "ok") ok++;
      else if (res === "cached") cached++;
      else missing++;
    } catch (err) {
      console.warn(`[textures:cobblemon] ${p}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[textures:cobblemon] ok=${ok} cached=${cached} missing=${missing}`);
}

async function fetchPokemonSprites(count: number) {
  console.log(`[textures:pokemon] ${count} sprites`);
  let ok = 0;
  let cached = 0;
  let missing = 0;
  for (let dex = 1; dex <= count; dex++) {
    try {
      const url = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${dex}.png`;
      const out = join(PUBLIC_DIR, "pokemon", `${dex}.png`);
      const res = await fetchTo(url, out);
      if (res === "ok") ok++;
      else if (res === "cached") cached++;
      else missing++;
      if ((dex % 100) === 0) console.log(`[textures:pokemon] progress ${dex}/${count}`);
    } catch (err) {
      console.warn(`[textures:pokemon] ${dex}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[textures:pokemon] ok=${ok} cached=${cached} missing=${missing}`);
}

const TYPE_ID: Record<string, number> = {
  normal: 1,
  fighting: 2,
  flying: 3,
  poison: 4,
  ground: 5,
  rock: 6,
  bug: 7,
  ghost: 8,
  steel: 9,
  fire: 10,
  water: 11,
  grass: 12,
  electric: 13,
  psychic: 14,
  ice: 15,
  dragon: 16,
  dark: 17,
  fairy: 18,
};

async function fetchTypeIcons() {
  console.log(`[textures:type] 18 types`);
  for (const [name, id] of Object.entries(TYPE_ID)) {
    const url = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/types/generation-ix/scarlet-violet/${id}.png`;
    const out = join(PUBLIC_DIR, "type", `${name}.png`);
    try {
      await fetchTo(url, out);
    } catch (err) {
      console.warn(`[textures:type] ${name}:`, err instanceof Error ? err.message : err);
    }
  }
}

async function main() {
  // Minecraft vanilla items referenced by Cobblemon recipes
  const mcItems = [
    "sugar",
    "wheat",
    "egg",
    "milk_bucket",
    "honey_bottle",
    "red_mushroom",
    "brown_mushroom",
    "apple",
    "carrot",
    "beetroot",
    "beef",
    "chicken",
    "cod",
    "melon_slice",
    "pumpkin",
    "cake",
    "cocoa_beans",
    "chorus_fruit",
    "chorus_flower",
    "allium",
    "blue_orchid",
    "azure_bluet",
  ];
  await fetchMinecraftItems(mcItems);

  // Cobblemon items: pull the list from what we ingested (berries + items referenced in recipes/seasonings)
  const berries = await db.select({ slug: schema.berries.slug }).from(schema.berries);
  const seasonings = await db.select({ slug: schema.seasonings.slug }).from(schema.seasonings);

  const cobblemonPaths: string[] = [];
  for (const b of berries) cobblemonPaths.push(`berries/${b.slug}.png`);
  cobblemonPaths.push(
    "vivichoke.png",
    "hearty_grains.png",
    "poke_bait.png",
    "food/poke_snack.png",
    "poke_puffs/poke_puff_base_sweet.png",
    "poke_puffs/poke_puff_base_dry.png",
    "poke_puffs/poke_puff_base_spicy.png",
    "poke_puffs/poke_puff_base_bitter.png",
    "poke_puffs/poke_puff_base_sour.png",
  );
  // Seasonings that are not berries: try in evolution/ then root
  for (const s of seasonings) {
    cobblemonPaths.push(`evolution/${s.slug}.png`);
    cobblemonPaths.push(`${s.slug}.png`);
  }
  await fetchCobblemonItems(cobblemonPaths);

  // Type icons
  await fetchTypeIcons();

  // Pokémon sprites (dex 1..1025)
  await fetchPokemonSprites(1025);

  console.log("[textures] done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
