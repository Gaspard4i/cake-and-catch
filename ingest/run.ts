import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/lib/db/client";
import {
  cloneRepo,
  dataPath,
  gitlabBlobUrl,
  listJsonFiles,
  readJson,
  relativeDataPath,
  type RepoClone,
} from "../src/lib/sources/gitlab";
import {
  ADDONS,
  downloadAndExtract,
  resolveLatestModrinthVersion,
  type AddonFetched,
} from "../src/lib/sources/addons";
import { speciesSchema } from "../src/lib/parsers/species";
import { spawnFileSchema, parseLevelRange } from "../src/lib/parsers/spawn";
import { seasoningSchema, baitEffectSchema } from "../src/lib/parsers/seasoning";
import { cookingRecipeSchema, shapedToGrid, classifyRecipe } from "../src/lib/parsers/recipe";
import { basename, relative } from "node:path";

function slugify(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
}

async function ingestSpecies(clone: RepoClone) {
  const dir = dataPath(clone, "species");
  const files = await listJsonFiles(dir);
  let ok = 0;
  let failed = 0;
  const slugToId = new Map<string, number>();

  for (const file of files) {
    try {
      const raw = await readJson(file);
      const parsed = speciesSchema.parse(raw);
      const slug = slugify(parsed.name);
      const relPath = relativeDataPath(clone, file);

      const [row] = await db
        .insert(schema.species)
        .values({
          dexNo: parsed.nationalPokedexNumber,
          slug,
          name: parsed.name,
          primaryType: parsed.primaryType,
          secondaryType: parsed.secondaryType ?? null,
          baseStats: parsed.baseStats,
          abilities: parsed.abilities,
          catchRate: parsed.catchRate,
          baseFriendship: parsed.baseFriendship ?? null,
          preferredFlavours: parsed.preferredFlavours ?? null,
          labels: parsed.labels,
          raw: parsed,
        })
        .onConflictDoUpdate({
          target: schema.species.slug,
          set: {
            dexNo: parsed.nationalPokedexNumber,
            name: parsed.name,
            primaryType: parsed.primaryType,
            secondaryType: parsed.secondaryType ?? null,
            baseStats: parsed.baseStats,
            abilities: parsed.abilities,
            catchRate: parsed.catchRate,
            baseFriendship: parsed.baseFriendship ?? null,
            preferredFlavours: parsed.preferredFlavours ?? null,
            labels: parsed.labels,
            raw: parsed,
            updatedAt: new Date(),
          },
        })
        .returning({ id: schema.species.id });

      slugToId.set(slug, row.id);

      await db.insert(schema.dataSources).values({
        entityType: "species",
        entityId: row.id,
        kind: "mod",
        url: gitlabBlobUrl(clone.commitSha, relPath),
        commitSha: clone.commitSha,
      });

      ok++;
    } catch (err) {
      failed++;
      console.warn(`[species] skip ${file}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[species] ok=${ok} failed=${failed}`);
  return slugToId;
}

async function ingestSpawnsFromDir(opts: {
  dir: string;
  slugToId: Map<string, number>;
  sourceKind: "mod" | "addon";
  sourceName: string;
  sourceUrl: string;
  externalIdPrefix?: string;
}) {
  const files = await listJsonFiles(opts.dir);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const rawJson = (await readJson(file)) as { enabled?: boolean };
      if (rawJson.enabled === false) {
        skipped++;
        continue;
      }
      const parsed = spawnFileSchema.parse(rawJson);
      for (const entry of parsed.spawns) {
        if (entry.type !== "pokemon") {
          skipped++;
          continue;
        }
        const slug = slugify(entry.pokemon.split(" ")[0]);
        const speciesId = opts.slugToId.get(slug);
        if (!speciesId) {
          skipped++;
          continue;
        }
        const { min, max } = parseLevelRange(entry.level);
        const biomes = entry.condition?.biomes ?? [];
        const externalId = opts.externalIdPrefix
          ? `${opts.externalIdPrefix}:${entry.id}`
          : entry.id;

        await db
          .insert(schema.spawns)
          .values({
            speciesId,
            externalId,
            bucket: entry.bucket,
            weight: entry.weight,
            levelMin: min,
            levelMax: max,
            context: entry.context ?? entry.spawnablePositionType ?? null,
            biomes,
            condition: entry.condition ?? null,
            anticondition: entry.anticondition ?? null,
            presets: entry.presets,
            sourceKind: opts.sourceKind,
            sourceName: opts.sourceName,
            sourceUrl: opts.sourceUrl,
          })
          .onConflictDoUpdate({
            target: [schema.spawns.externalId, schema.spawns.sourceName],
            set: {
              speciesId,
              bucket: entry.bucket,
              weight: entry.weight,
              levelMin: min,
              levelMax: max,
              context: entry.context ?? entry.spawnablePositionType ?? null,
              biomes,
              condition: entry.condition ?? null,
              anticondition: entry.anticondition ?? null,
              presets: entry.presets,
              sourceKind: opts.sourceKind,
              sourceUrl: opts.sourceUrl,
            },
          });
        ok++;
      }
    } catch (err) {
      failed++;
      console.warn(
        `[spawns:${opts.sourceName}] skip ${file}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`[spawns:${opts.sourceName}] ok=${ok} skipped=${skipped} failed=${failed}`);
}

async function ingestAddons(slugToId: Map<string, number>) {
  const fetched: AddonFetched[] = [];
  for (const addon of ADDONS) {
    try {
      console.log(`[addon] resolving ${addon.name}`);
      const resolved = await resolveLatestModrinthVersion(addon.modrinthSlug);
      const full = { ...addon, ...resolved };
      console.log(`[addon] downloading ${addon.name} (${resolved.versionName})`);
      const result = await downloadAndExtract(full);
      fetched.push(result);
    } catch (err) {
      console.warn(`[addon] skip ${addon.name}:`, err instanceof Error ? err.message : err);
    }
  }

  for (const addon of fetched) {
    await ingestSpawnsFromDir({
      dir: addon.spawnPoolDir,
      slugToId,
      sourceKind: "addon",
      sourceName: addon.name,
      sourceUrl: addon.pageUrl,
      externalIdPrefix: addon.name,
    });
  }
}

async function ingestSeasonings(clone: RepoClone) {
  const dir = dataPath(clone, "seasonings");
  const files = await listJsonFiles(dir);
  let ok = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const raw = await readJson(file);
      const parsed = seasoningSchema.parse(raw);
      const item = parsed.ingredient ?? parsed.item;
      if (!item) continue;
      const slug = basename(file, ".json");
      await db
        .insert(schema.seasonings)
        .values({
          itemId: item,
          slug,
          colour: parsed.colour ?? parsed.color ?? null,
          raw: parsed,
        })
        .onConflictDoUpdate({
          target: schema.seasonings.slug,
          set: { itemId: item, colour: parsed.colour ?? parsed.color ?? null, raw: parsed },
        });
      ok++;
    } catch (err) {
      failed++;
      console.warn(`[seasonings] skip ${file}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[seasonings] ok=${ok} failed=${failed}`);
}

async function ingestRecipes(clone: RepoClone) {
  const dir = dataPath(clone, "recipe", "campfire_pot");
  const files = await listJsonFiles(dir);
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const raw = (await readJson(file)) as { type?: string };
      if (
        raw.type !== "cobblemon:cooking_pot" &&
        raw.type !== "cobblemon:cooking_pot_shapeless"
      ) {
        skipped++;
        continue;
      }
      const parsed = cookingRecipeSchema.parse(raw);
      const slug = basename(file, ".json");
      const resultId = parsed.result.id;
      const kind = classifyRecipe(resultId);
      const shape =
        parsed.type === "cobblemon:cooking_pot" ? "shaped" : "shapeless";

      const values = {
        slug,
        kind,
        resultId,
        resultCount: parsed.result.count ?? 1,
        shape,
        grid: parsed.type === "cobblemon:cooking_pot" ? shapedToGrid(parsed) : null,
        ingredients:
          parsed.type === "cobblemon:cooking_pot_shapeless" ? parsed.ingredients : null,
        seasoningTag: parsed.seasoningTag ?? null,
        seasoningProcessors: parsed.seasoningProcessors,
        raw: parsed,
      } as const;

      await db
        .insert(schema.recipes)
        .values(values)
        .onConflictDoUpdate({ target: schema.recipes.slug, set: values });
      ok++;
    } catch (err) {
      failed++;
      console.warn(`[recipes] skip ${file}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[recipes] ok=${ok} skipped=${skipped} failed=${failed}`);
}

async function ingestBaitEffects(clone: RepoClone) {
  const dir = dataPath(clone, "spawn_bait_effects");
  const files = await listJsonFiles(dir);
  let ok = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const raw = await readJson(file);
      const parsed = baitEffectSchema.parse(raw);
      const relativePath = relative(dir, file).replaceAll("\\", "/");
      const slug = relativePath.replace(/\.json$/, "").replaceAll("/", "-");
      await db
        .insert(schema.baitEffects)
        .values({ itemId: parsed.item, slug, effects: parsed.effects, raw: parsed })
        .onConflictDoUpdate({
          target: schema.baitEffects.slug,
          set: { itemId: parsed.item, effects: parsed.effects, raw: parsed },
        });
      ok++;
    } catch (err) {
      failed++;
      console.warn(`[bait_effects] skip ${file}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[bait_effects] ok=${ok} failed=${failed}`);
}

async function main() {
  const target = join(tmpdir(), "cake-and-catch-cobblemon");
  console.log(`[ingest] cloning Cobblemon into ${target}`);
  const clone = await cloneRepo(target);
  console.log(`[ingest] commit ${clone.commitSha}`);

  await db.execute(sql`truncate table ${schema.dataSources}`);
  await db.execute(sql`truncate table ${schema.spawns} restart identity cascade`);

  const slugToId = await ingestSpecies(clone);

  await ingestSpawnsFromDir({
    dir: dataPath(clone, "spawn_pool_world"),
    slugToId,
    sourceKind: "mod",
    sourceName: "cobblemon",
    sourceUrl: "https://gitlab.com/cable-mc/cobblemon",
  });

  await ingestAddons(slugToId);
  await ingestSeasonings(clone);
  await ingestBaitEffects(clone);
  await ingestRecipes(clone);

  console.log("[ingest] done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
