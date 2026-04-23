import { mkdir, writeFile, access, readFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { db, schema } from "../src/lib/db/client";

const MC_VERSION = "1.21.4";
const MC_GH = (kind: "item" | "block", name: string) =>
  `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/${MC_VERSION}/assets/minecraft/textures/${kind}/${name}.png`;

const COBBLEMON_GH = (relPath: string) =>
  `https://gitlab.com/cable-mc/cobblemon/-/raw/main/common/src/main/resources/assets/cobblemon/textures/${relPath}`;

const PUBLIC_DIR = join(process.cwd(), "public", "textures");
const UA = "snack-and-catch/0.1";

async function ensureDir(p: string) {
  await mkdir(dirname(p), { recursive: true });
}

async function fileIsValidPng(p: string): Promise<boolean> {
  try {
    const buf = await readFile(p);
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  } catch {
    return false;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url: string, out: string): Promise<"ok" | "missing"> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 404) return "missing";
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith("{")) return "missing";
  await ensureDir(out);
  await writeFile(out, text);
  return "ok";
}

async function tryManyJson(urls: string[], out: string): Promise<"ok" | "cached" | "missing"> {
  if (await pathExists(out)) return "cached";
  for (const url of urls) {
    const r = await fetchJson(url, out);
    if (r === "ok") return "ok";
  }
  return "missing";
}

async function fetchUrl(url: string, out: string): Promise<"ok" | "missing"> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 404) return "missing";
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Reject HTML masquerading as PNG
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return "missing";
  await ensureDir(out);
  await writeFile(out, buf);
  return "ok";
}

async function tryMany(urls: string[], out: string): Promise<"ok" | "cached" | "missing"> {
  if (await pathExists(out)) {
    if (await fileIsValidPng(out)) return "cached";
    await unlink(out);
  }
  for (const url of urls) {
    const r = await fetchUrl(url, out);
    if (r === "ok") return "ok";
  }
  return "missing";
}

async function fetchMinecraftItem(name: string) {
  const out = join(PUBLIC_DIR, "minecraft", "item", `${name}.png`);
  return tryMany([MC_GH("item", name), MC_GH("block", name)], out);
}

async function fetchCobblemonItem(name: string, pathHints: string[] = []) {
  const out = join(PUBLIC_DIR, "cobblemon", "item", `${name}.png`);
  const candidates = [
    ...pathHints.map((h) => COBBLEMON_GH(`item/${h}/${name}.png`)),
    COBBLEMON_GH(`item/${name}.png`),
    COBBLEMON_GH(`item/berries/${name}.png`),
    COBBLEMON_GH(`item/food/${name}.png`),
    COBBLEMON_GH(`item/evolution/${name}.png`),
    COBBLEMON_GH(`item/held_items/${name}.png`),
    COBBLEMON_GH(`item/medicine/${name}.png`),
    COBBLEMON_GH(`item/fishing/${name}.png`),
  ];
  return tryMany(candidates, out);
}

async function fetchCobblemonBlock(relativePath: string) {
  const out = join(PUBLIC_DIR, "cobblemon", "block", relativePath);
  return tryMany([COBBLEMON_GH(`block/${relativePath}`)], out);
}

type Bucket = { ok: number; cached: number; missing: number };
function bucket(): Bucket {
  return { ok: 0, cached: 0, missing: 0 };
}
function add(b: Bucket, r: "ok" | "cached" | "missing") {
  if (r === "ok") b.ok++;
  else if (r === "cached") b.cached++;
  else b.missing++;
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

async function main() {
  console.log("[textures] auto-discovering required items from DB…");

  // --- Collect all item ids needed by seasonings, recipes, berries ---
  const seasonings = await db.select({ itemId: schema.seasonings.itemId }).from(schema.seasonings);
  const berries = await db.select({ slug: schema.berries.slug }).from(schema.berries);

  // Pull recipe ingredients from the raw jsonb
  const recipes = await db.select({ raw: schema.recipes.raw }).from(schema.recipes);
  const recipeItems = new Set<string>();
  for (const r of recipes) {
    const raw = r.raw as Record<string, unknown>;
    const key = raw.key as Record<string, { item?: string }> | undefined;
    if (key) {
      for (const v of Object.values(key)) if (v?.item) recipeItems.add(v.item);
    }
    const ingredients = raw.ingredients as Array<{ item?: string }> | undefined;
    if (ingredients) {
      for (const ing of ingredients) if (ing.item) recipeItems.add(ing.item);
    }
    const result = raw.result as { id?: string } | undefined;
    if (result?.id) recipeItems.add(result.id);
  }

  const allItemIds = new Set<string>();
  for (const s of seasonings) allItemIds.add(s.itemId);
  for (const b of berries) allItemIds.add(`cobblemon:${b.slug}`);
  for (const id of recipeItems) allItemIds.add(id);

  const mcSet = new Set<string>();
  const cobblemonSet = new Set<string>();
  for (const id of allItemIds) {
    const [ns, raw] = id.split(":");
    if (!raw) continue;
    if (ns === "minecraft") mcSet.add(raw);
    else if (ns === "cobblemon") cobblemonSet.add(raw);
  }

  // --- Fetch Minecraft items ---
  console.log(`[textures:mc] ${mcSet.size} items`);
  const mc = bucket();
  for (const name of mcSet) {
    try {
      add(mc, await fetchMinecraftItem(name));
    } catch (err) {
      console.warn(`[textures:mc] ${name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[textures:mc] ok=${mc.ok} cached=${mc.cached} missing=${mc.missing}`);

  // --- Fetch Cobblemon items ---
  console.log(`[textures:cobblemon] ${cobblemonSet.size} items`);
  const cob = bucket();
  for (const name of cobblemonSet) {
    try {
      const hints = name.endsWith("_berry") ? ["berries"] : name.endsWith("_sweet") ? ["evolution"] : [];
      add(cob, await fetchCobblemonItem(name, hints));
    } catch (err) {
      console.warn(`[textures:cobblemon] ${name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[textures:cobblemon] ok=${cob.ok} cached=${cob.cached} missing=${cob.missing}`);

  // --- Poké Cake block textures (for 3D preview) ---
  console.log("[textures:cobblemon/block] cake block textures");
  const block = bucket();
  for (const name of [
    "food/poke_snack_top.png",
    "food/poke_snack_top_overlay.png",
    "food/poke_snack_bottom.png",
    "food/poke_snack_side.png",
    "food/poke_snack_side_overlay.png",
    "food/poke_snack_particle.png",
    "food/poke_snack_inside.png",
    "food/poke_snack_inside_overlay.png",
  ]) {
    try {
      add(block, await fetchCobblemonBlock(name));
    } catch (err) {
      console.warn(`[textures:cobblemon/block] ${name}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[textures:cobblemon/block] ok=${block.ok} cached=${block.cached} missing=${block.missing}`);

  // --- Berry 3D Bedrock models + fruit textures ---
  // Needed by Snack3D to render the real 3D berries on top of the Poké Snack,
  // matching PokeSnackBlockEntityRenderer in the mod.
  console.log("[textures:cobblemon/berry-geo] berry Bedrock models + fruit textures");
  const geoTargets = await db
    .select({ slug: schema.berries.slug, raw: schema.berries.raw })
    .from(schema.berries);
  const geo = bucket();
  const fruit = bucket();
  for (const b of geoTargets) {
    const raw = (b.raw ?? {}) as Record<string, unknown>;
    const geoId = (raw.fruitModel as string | undefined) ?? `cobblemon:${b.slug}.geo`;
    const texId = (raw.fruitTexture as string | undefined) ?? `cobblemon:${b.slug.replace(/_berry$/, "")}`;
    const geoName = geoId.replace(/^cobblemon:/, "").replace(/\.geo$/, "");
    const texName = texId.replace(/^cobblemon:/, "");
    try {
      const geoOut = join(PUBLIC_DIR, "cobblemon", "bedrock", "berries", `${geoName}.geo.json`);
      const url = `https://gitlab.com/cable-mc/cobblemon/-/raw/main/common/src/main/resources/assets/cobblemon/bedrock/berries/${geoName}.geo.json`;
      add(geo, await tryManyJson([url], geoOut));
    } catch (err) {
      geo.missing++;
      console.warn(`[berry-geo] ${geoName}:`, err instanceof Error ? err.message : err);
    }
    try {
      const texOut = join(PUBLIC_DIR, "cobblemon", "berries", `${texName}.png`);
      add(fruit, await tryMany([COBBLEMON_GH(`berries/${texName}.png`)], texOut));
    } catch (err) {
      fruit.missing++;
      console.warn(`[berry-fruit] ${texName}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[berry-geo] ok=${geo.ok} cached=${geo.cached} missing=${geo.missing}`);
  console.log(`[berry-fruit] ok=${fruit.ok} cached=${fruit.cached} missing=${fruit.missing}`);

  // --- Type icons (PokeAPI) ---
  console.log("[textures:type] 18 types");
  for (const [name, id] of Object.entries(TYPE_ID)) {
    const out = join(PUBLIC_DIR, "type", `${name}.png`);
    await tryMany(
      [`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/types/generation-ix/scarlet-violet/${id}.png`],
      out,
    );
  }

  // --- Pokémon sprites (normal + shiny) ---
  console.log("[textures:pokemon] 1025 × 2 sprites (normal + shiny)");
  const pk = bucket();
  for (let dex = 1; dex <= 1025; dex++) {
    try {
      const normal = join(PUBLIC_DIR, "pokemon", `${dex}.png`);
      add(pk, await tryMany(
        [`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${dex}.png`],
        normal,
      ));
    } catch (err) {
      console.warn(`[textures:pokemon] ${dex}:`, err instanceof Error ? err.message : err);
    }
    if (dex % 100 === 0) console.log(`[textures:pokemon] progress ${dex}/1025`);
  }
  console.log(`[textures:pokemon] ok=${pk.ok} cached=${pk.cached} missing=${pk.missing}`);

  // --- Pokémon shiny sprites ---
  console.log("[textures:pokemon-shiny] 1025 sprites");
  const sh = bucket();
  for (let dex = 1; dex <= 1025; dex++) {
    try {
      const out = join(PUBLIC_DIR, "pokemon", "shiny", `${dex}.png`);
      add(sh, await tryMany(
        [`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${dex}.png`],
        out,
      ));
    } catch (err) {
      console.warn(`[textures:pokemon-shiny] ${dex}:`, err instanceof Error ? err.message : err);
    }
    if (dex % 200 === 0) console.log(`[textures:pokemon-shiny] progress ${dex}/1025`);
  }
  console.log(`[textures:pokemon-shiny] ok=${sh.ok} cached=${sh.cached} missing=${sh.missing}`);

  console.log("[textures] done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
