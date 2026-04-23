import { z } from "zod";

const baseStatsSchema = z.object({
  hp: z.number(),
  attack: z.number(),
  defence: z.number(),
  special_attack: z.number(),
  special_defence: z.number(),
  speed: z.number(),
});

export const speciesSchema = z
  .object({
    implemented: z.boolean().optional(),
    nationalPokedexNumber: z.number().int().positive(),
    name: z.string(),
    primaryType: z.string(),
    secondaryType: z.string().optional(),
    abilities: z.array(z.string()).default([]),
    baseStats: baseStatsSchema,
    catchRate: z.number().int(),
    baseFriendship: z.number().int().optional(),
    labels: z.array(z.string()).default([]),
    eggGroups: z.array(z.string()).default([]),
    preferredFlavours: z.array(z.string()).optional(),
    evolutions: z.array(z.unknown()).optional(),
    drops: z.unknown().optional(),
  })
  .passthrough();

export type Species = z.infer<typeof speciesSchema>;
