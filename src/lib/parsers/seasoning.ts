import { z } from "zod";

export const seasoningSchema = z
  .object({
    ingredient: z.string().optional(),
    item: z.string().optional(),
    colour: z.string().optional(),
    color: z.string().optional(),
  })
  .passthrough();

export type SeasoningRaw = z.infer<typeof seasoningSchema>;

export const baitEffectSchema = z
  .object({
    item: z.string(),
    effects: z.array(z.record(z.string(), z.unknown())).default([]),
  })
  .passthrough();

export type BaitEffectRaw = z.infer<typeof baitEffectSchema>;
