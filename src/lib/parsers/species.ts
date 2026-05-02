import { z } from "zod";

const baseStatsSchema = z.object({
  hp: z.number(),
  attack: z.number(),
  defence: z.number(),
  special_attack: z.number(),
  special_defence: z.number(),
  speed: z.number(),
});

/**
 * Regional / alternate forms (Alolan, Galarian, Hisuian, Paldean, …)
 * live under `species.forms[]`. Each form may override types,
 * abilities, base stats, etc. We match by `aspects[]` — entries with
 * a non-empty aspect list are what spawn JSONs reference via
 * `pokemon: "vulpix alolan"`.
 */
const formSchema = z
  .object({
    name: z.string().optional(),
    aspects: z.array(z.string()).default([]),
    primaryType: z.string().optional(),
    secondaryType: z.string().optional(),
    abilities: z.array(z.string()).optional(),
    baseStats: baseStatsSchema.partial().optional(),
    labels: z.array(z.string()).optional(),
    catchRate: z.number().int().optional(),
    baseFriendship: z.number().int().optional(),
    preferredFlavours: z.array(z.string()).optional(),
  })
  .passthrough();

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
    forms: z.array(formSchema).optional(),
  })
  .passthrough();

export type SpeciesForm = z.infer<typeof formSchema>;
export type Species = z.infer<typeof speciesSchema>;
