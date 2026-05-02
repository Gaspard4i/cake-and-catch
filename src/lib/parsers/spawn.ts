import { z } from "zod";

const bucketSchema = z.enum(["common", "uncommon", "rare", "ultra-rare"]);

const conditionSchema = z
  .object({
    biomes: z.array(z.string()).optional(),
    structures: z.array(z.string()).optional(),
    timeRange: z.string().optional(),
    moonPhase: z.union([z.string(), z.number()]).optional(),
    isRaining: z.boolean().optional(),
    isThundering: z.boolean().optional(),
    isSlimeChunk: z.boolean().optional(),
    canSeeSky: z.boolean().optional(),
    minSkyLight: z.number().optional(),
    maxSkyLight: z.number().optional(),
    minLight: z.number().optional(),
    maxLight: z.number().optional(),
    minY: z.number().optional(),
    maxY: z.number().optional(),
    minX: z.number().optional(),
    maxX: z.number().optional(),
    minZ: z.number().optional(),
    maxZ: z.number().optional(),
    minWidth: z.number().optional(),
    maxWidth: z.number().optional(),
    minHeight: z.number().optional(),
    maxHeight: z.number().optional(),
    minDepth: z.number().optional(),
    maxDepth: z.number().optional(),
    neededBaseBlocks: z.array(z.string()).optional(),
    neededNearbyBlocks: z.array(z.string()).optional(),
    fluidIsSource: z.boolean().optional(),
    fluid: z.string().optional(),
    labels: z.array(z.string()).optional(),
    labelMode: z.enum(["ANY", "ALL"]).optional(),
    dimensions: z.array(z.string()).optional(),
  })
  .passthrough();

const compositeConditionSchema = z
  .object({
    conditions: z.array(conditionSchema).optional(),
    anticonditions: z.array(conditionSchema).optional(),
  })
  .passthrough();

const weightMultiplierSchema = z
  .object({
    multiplier: z.number(),
    condition: conditionSchema.optional(),
    anticondition: conditionSchema.optional(),
  })
  .passthrough();

const spawnEntrySchema = z
  .object({
    id: z.string(),
    pokemon: z.string(),
    type: z.string().default("pokemon"),
    presets: z.array(z.string()).default([]),
    spawnablePositionType: z.string().optional(),
    context: z.string().optional(),
    bucket: bucketSchema,
    level: z.string(),
    weight: z.number(),
    percentage: z.number().min(0).max(100).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    labels: z.array(z.string()).optional(),
    condition: conditionSchema.optional(),
    anticondition: conditionSchema.optional(),
    compositeCondition: compositeConditionSchema.optional(),
    weightMultiplier: weightMultiplierSchema.optional(),
    weightMultipliers: z.array(weightMultiplierSchema).optional(),
  })
  .passthrough();

export const spawnFileSchema = z.object({
  enabled: z.boolean().default(true),
  neededInstalledMods: z.array(z.string()).default([]),
  neededUninstalledMods: z.array(z.string()).default([]),
  spawns: z.array(spawnEntrySchema),
});

export type SpawnCondition = z.infer<typeof conditionSchema>;
export type SpawnCompositeCondition = z.infer<typeof compositeConditionSchema>;
export type SpawnWeightMultiplier = z.infer<typeof weightMultiplierSchema>;
export type SpawnFile = z.infer<typeof spawnFileSchema>;
export type SpawnEntry = z.infer<typeof spawnEntrySchema>;

export function parseLevelRange(level: string): { min: number; max: number } {
  const match = level.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`invalid level range: ${level}`);
  const min = Number.parseInt(match[1], 10);
  const max = match[2] ? Number.parseInt(match[2], 10) : min;
  return { min, max };
}

/**
 * Preset definitions live in `data/cobblemon/spawn_detail_presets/*.json`.
 * They package conditions / anticonditions referenced by spawn entries via
 * the `presets` field. We parse the same condition shape (most presets only
 * use a subset).
 */
export const presetFileSchema = z
  .object({
    context: z.string().optional(),
    spawnablePositionType: z.string().optional(),
    bucket: bucketSchema.optional(),
    weight: z.number().optional(),
    weightMultiplier: weightMultiplierSchema.optional(),
    weightMultipliers: z.array(weightMultiplierSchema).optional(),
    condition: conditionSchema.optional(),
    anticondition: conditionSchema.optional(),
    compositeCondition: compositeConditionSchema.optional(),
    labels: z.array(z.string()).optional(),
  })
  .passthrough();

export type PresetFile = z.infer<typeof presetFileSchema>;

/**
 * Merge a preset's condition into a spawn-local condition.
 * Spawn-local scalars OVERRIDE preset scalars; arrays are UNIONed
 * (deduped). Mirrors how Cobblemon resolves presets at spawn-detail load.
 */
export function mergeCondition(
  preset: SpawnCondition | undefined,
  local: SpawnCondition | undefined,
): SpawnCondition | undefined {
  if (!preset && !local) return undefined;
  if (!preset) return local;
  if (!local) return preset;
  const out: Record<string, unknown> = { ...preset };
  for (const [k, v] of Object.entries(local)) {
    if (v === undefined) continue;
    const prev = out[k];
    if (Array.isArray(prev) && Array.isArray(v)) {
      out[k] = Array.from(new Set([...(prev as unknown[]), ...(v as unknown[])]));
    } else {
      out[k] = v;
    }
  }
  return out as SpawnCondition;
}

export function applyPresets(
  entry: SpawnEntry,
  presetMap: Map<string, PresetFile>,
): SpawnEntry {
  if (!entry.presets || entry.presets.length === 0) return entry;
  let condition = entry.condition;
  let anticondition = entry.anticondition;
  for (const name of entry.presets) {
    const p = presetMap.get(name);
    if (!p) continue;
    condition = mergeCondition(p.condition, condition);
    anticondition = mergeCondition(p.anticondition, anticondition);
  }
  return { ...entry, condition, anticondition };
}
