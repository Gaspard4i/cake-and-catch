import { z } from "zod";

const itemRef = z.object({
  item: z.string().optional(),
  tag: z.string().optional(),
});

const resultSchema = z.object({
  id: z.string(),
  count: z.number().int().optional(),
});

export const shapedSchema = z
  .object({
    type: z.literal("cobblemon:cooking_pot"),
    category: z.string().optional(),
    key: z.record(z.string(), itemRef),
    pattern: z.array(z.string()).min(1).max(3),
    result: resultSchema,
    seasoningTag: z.string().optional(),
    seasoningProcessors: z.array(z.string()).default([]),
  })
  .passthrough();

export const shapelessSchema = z
  .object({
    type: z.literal("cobblemon:cooking_pot_shapeless"),
    category: z.string().optional(),
    ingredients: z.array(itemRef),
    result: resultSchema,
    seasoningTag: z.string().optional(),
    seasoningProcessors: z.array(z.string()).default([]),
  })
  .passthrough();

export const cookingRecipeSchema = z.union([shapedSchema, shapelessSchema]);

export type CookingRecipe = z.infer<typeof cookingRecipeSchema>;

export type GridCell = { item?: string; tag?: string } | null;

/** Expand a 3x3 grid (row-major) from a shaped recipe. Pads shorter patterns with nulls. */
export function shapedToGrid(r: z.infer<typeof shapedSchema>): GridCell[][] {
  const rows = 3;
  const cols = 3;
  const grid: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
  for (let y = 0; y < r.pattern.length; y++) {
    const line = r.pattern[y];
    for (let x = 0; x < Math.min(cols, line.length); x++) {
      const char = line[x];
      if (char === " ") continue;
      const ref = r.key[char];
      if (ref) grid[y][x] = { item: ref.item, tag: ref.tag };
    }
  }
  return grid;
}

export function classifyRecipe(result: string): "cake" | "bait" | "snack" | "aprijuice" | "other" {
  const id = result.replace(/^cobblemon:/, "");
  if (id === "poke_cake") return "cake";
  if (id === "poke_bait") return "bait";
  if (id === "poke_snack") return "snack";
  if (id.includes("aprijuice")) return "aprijuice";
  return "other";
}
