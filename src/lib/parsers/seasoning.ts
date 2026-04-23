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

export const FLAVOURS = ["SWEET", "SPICY", "DRY", "BITTER", "SOUR"] as const;
export type Flavour = (typeof FLAVOURS)[number];

export const berrySchema = z
  .object({
    identifier: z.string().optional(),
    flavours: z.record(z.string(), z.number()).default({}),
    colour: z.string().optional(),
    weight: z.number().optional(),
  })
  .passthrough();

export type BerryRaw = z.infer<typeof berrySchema>;

export function dominantFlavour(
  flavours: Record<string, number>,
): Flavour | null {
  let best: Flavour | null = null;
  let bestVal = -Infinity;
  for (const f of FLAVOURS) {
    const v = flavours[f] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = f;
    }
  }
  return bestVal > 0 ? best : null;
}
