import { describe, it, expect } from "vitest";
import {
  cobblemonToolsSlug,
  showdownSlug,
  spriteCandidates,
} from "@/lib/sprites/pokemon-sprite";

describe("cobblemonToolsSlug", () => {
  it("returns the base slug as-is", () => {
    expect(cobblemonToolsSlug({ name: "Vulpix", baseSlug: "vulpix" })).toBe("vulpix");
  });

  it("rewrites regional aspects to cobblemon.tools' convention", () => {
    expect(
      cobblemonToolsSlug({ name: "Vulpix", baseSlug: "vulpix", variantLabel: "alolan" }),
    ).toBe("vulpix-alola");
    expect(
      cobblemonToolsSlug({
        name: "Slowpoke",
        baseSlug: "slowpoke",
        variantLabel: "galarian",
      }),
    ).toBe("slowpoke-galar");
    expect(
      cobblemonToolsSlug({
        name: "Tauros",
        baseSlug: "tauros",
        variantLabel: "paldean-combat",
      }),
    ).toBe("tauros-paldea-combat");
  });

  it("passes mega/gmax through unchanged", () => {
    expect(
      cobblemonToolsSlug({ name: "Charizard", baseSlug: "charizard", variantLabel: "mega-x" }),
    ).toBe("charizard-mega-x");
    expect(
      cobblemonToolsSlug({ name: "Charizard", baseSlug: "charizard", variantLabel: "gmax" }),
    ).toBe("charizard-gmax");
  });
});

describe("showdownSlug", () => {
  it("keeps the regional `-n` suffix", () => {
    // Showdown spells the regional families with the `-n` ending we
    // already use in the DB (`vulpix-alolan`).
    expect(
      showdownSlug({ name: "Vulpix", baseSlug: "vulpix", variantLabel: "alolan" }),
    ).toBe("vulpix-alolan");
  });

  it("re-spells `paldean` to `paldea`", () => {
    expect(
      showdownSlug({
        name: "Tauros",
        baseSlug: "tauros",
        variantLabel: "paldean-combat",
      }),
    ).toBe("tauros-paldea-combat");
  });
});

describe("spriteCandidates", () => {
  it("emits Cobblemon → Showdown → PokeAPI in that order", () => {
    const c = spriteCandidates({ dexNo: 6, name: "Charizard", baseSlug: "charizard" });
    expect(c[0]).toContain("cobblemon.tools/pokedex/pokemon/charizard/sprite.png");
    expect(c[1]).toContain("pokemonshowdown.com/sprites/dex/charizard.png");
    expect(c[2]).toContain("PokeAPI/sprites@master/sprites/pokemon/6.png");
  });

  it("routes shiny variants to the shiny PokeAPI/Showdown paths", () => {
    const c = spriteCandidates({
      dexNo: 6,
      name: "Charizard",
      baseSlug: "charizard",
      shiny: true,
    });
    // Cobblemon doesn't expose a separate shiny path; we still try
    // it first as a regular fallback.
    expect(c[0]).toContain("cobblemon.tools/pokedex/pokemon/charizard/sprite.png");
    expect(c[1]).toContain("dex-shiny/charizard.png");
    expect(c[2]).toContain("/shiny/6.png");
  });
});
