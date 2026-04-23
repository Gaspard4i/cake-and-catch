import { z } from "zod";

const bucketSchema = z.enum(["common", "uncommon", "rare", "ultra-rare"]);

const conditionSchema = z
  .object({
    biomes: z.array(z.string()).optional(),
    structures: z.array(z.string()).optional(),
    timeRange: z.string().optional(),
    moonPhase: z.string().optional(),
    isRaining: z.boolean().optional(),
    isThundering: z.boolean().optional(),
    minSkyLight: z.number().optional(),
    maxSkyLight: z.number().optional(),
    minLight: z.number().optional(),
    maxLight: z.number().optional(),
    minY: z.number().optional(),
    maxY: z.number().optional(),
    neededBaseBlocks: z.array(z.string()).optional(),
    neededNearbyBlocks: z.array(z.string()).optional(),
    fluidIsSource: z.boolean().optional(),
    fluid: z.string().optional(),
    labels: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
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
    condition: conditionSchema.optional(),
    anticondition: conditionSchema.optional(),
  })
  .passthrough();

export const spawnFileSchema = z.object({
  enabled: z.boolean().default(true),
  neededInstalledMods: z.array(z.string()).default([]),
  neededUninstalledMods: z.array(z.string()).default([]),
  spawns: z.array(spawnEntrySchema),
});

export type SpawnFile = z.infer<typeof spawnFileSchema>;
export type SpawnEntry = z.infer<typeof spawnEntrySchema>;

export function parseLevelRange(level: string): { min: number; max: number } {
  const match = level.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`invalid level range: ${level}`);
  const min = Number.parseInt(match[1], 10);
  const max = match[2] ? Number.parseInt(match[2], 10) : min;
  return { min, max };
}
