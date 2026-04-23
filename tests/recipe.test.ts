import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  classifyRecipe,
  cookingRecipeSchema,
  shapedSchema,
  shapedToGrid,
} from "@/lib/parsers/recipe";

const pokeCake = {
  type: "cobblemon:cooking_pot",
  category: "complex_dishes",
  key: {
    M: { tag: "c:drinks/milk" },
    S: { item: "minecraft:sugar" },
    V: { item: "cobblemon:vivichoke" },
    G: { item: "cobblemon:hearty_grains" },
  },
  pattern: ["MMM", "SVS", "GGG"],
  result: { id: "cobblemon:poke_cake" },
  seasoningTag: "cobblemon:recipe_filters/flavour_seasoning",
  seasoningProcessors: ["food_colour", "ingredient"],
};

const pokeBait = {
  type: "cobblemon:cooking_pot_shapeless",
  category: "complex_dishes",
  ingredients: [
    { item: "minecraft:honey_bottle" },
    { tag: "c:mushrooms" },
    { item: "minecraft:wheat" },
  ],
  result: { id: "cobblemon:poke_bait", count: 4 },
  seasoningTag: "cobblemon:recipe_filters/bait_seasoning",
  seasoningProcessors: ["spawn_bait", "food_colour"],
};

describe("classifyRecipe", () => {
  it("classifies cake/bait/snack", () => {
    expect(classifyRecipe("cobblemon:poke_cake")).toBe("cake");
    expect(classifyRecipe("cobblemon:poke_bait")).toBe("bait");
    expect(classifyRecipe("cobblemon:poke_snack")).toBe("snack");
  });
  it("classifies aprijuice variants", () => {
    expect(classifyRecipe("cobblemon:aprijuice_black")).toBe("aprijuice");
    expect(classifyRecipe("cobblemon:aprijuice_yellow")).toBe("aprijuice");
  });
  it("falls back to other", () => {
    expect(classifyRecipe("cobblemon:casteliacone")).toBe("other");
  });
});

describe("cookingRecipeSchema", () => {
  it("parses a shaped Poké Cake", () => {
    const parsed = cookingRecipeSchema.parse(pokeCake);
    expect(parsed.type).toBe("cobblemon:cooking_pot");
    expect(parsed.result.id).toBe("cobblemon:poke_cake");
  });
  it("parses a shapeless Poké Bait", () => {
    const parsed = cookingRecipeSchema.parse(pokeBait);
    expect(parsed.type).toBe("cobblemon:cooking_pot_shapeless");
    expect(parsed.result.count).toBe(4);
  });
});

describe("shapedToGrid", () => {
  it("maps pattern + key into a 3x3 grid", () => {
    const parsed = shapedSchema.parse(pokeCake);
    const grid = shapedToGrid(parsed);
    expect(grid).toHaveLength(3);
    expect(grid[0][0]).toEqual({ tag: "c:drinks/milk", item: undefined });
    expect(grid[1][1]).toEqual({ item: "cobblemon:vivichoke", tag: undefined });
    expect(grid[2][2]).toEqual({ item: "cobblemon:hearty_grains", tag: undefined });
  });
  it("pads shorter patterns with null", () => {
    const recipe = shapedSchema.parse({
      ...pokeCake,
      pattern: ["MMM"],
    });
    const grid = shapedToGrid(recipe);
    expect(grid[1][0]).toBeNull();
    expect(grid[2][2]).toBeNull();
  });
});
