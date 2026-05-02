import { describe, it, expect } from "vitest";
import { showdownSlug, spriteCandidates } from "@/lib/sprites/pokemon-sprite";

describe("showdownSlug", () => {
  it("returns the base slug as-is", () => {
    expect(showdownSlug({ name: "Vulpix", baseSlug: "vulpix" })).toBe("vulpix");
  });

  it("appends regional variants", () => {
    expect(
      showdownSlug({ name: "Vulpix", baseSlug: "vulpix", variantLabel: "alolan" }),
    ).toBe("vulpix-alolan");
  });

  it("re-spells `paldean` to `paldea` to match Showdown", () => {
    expect(
      showdownSlug({
        name: "Tauros",
        baseSlug: "tauros",
        variantLabel: "paldean-combat",
      }),
    ).toBe("tauros-paldea-combat");
  });

  it("strips parenthetical suffixes from the human name", () => {
    expect(showdownSlug({ name: "Vulpix (alolan)", variantLabel: "alolan" })).toBe(
      "vulpix-alolan",
    );
  });

  it("normalises underscores in the variant label", () => {
    expect(
      showdownSlug({ name: "Charizard", baseSlug: "charizard", variantLabel: "mega_x" }),
    ).toBe("charizard-mega-x");
  });
});

describe("spriteCandidates", () => {
  it("emits Showdown first then PokeAPI", () => {
    const c = spriteCandidates({ dexNo: 6, name: "Charizard", baseSlug: "charizard" });
    expect(c[0]).toContain("pokemonshowdown.com/sprites/dex/charizard.png");
    expect(c[1]).toContain("PokeAPI/sprites@master/sprites/pokemon/6.png");
  });

  it("routes shiny variants to the dex-shiny path", () => {
    const c = spriteCandidates({
      dexNo: 6,
      name: "Charizard",
      baseSlug: "charizard",
      shiny: true,
    });
    expect(c[0]).toContain("dex-shiny/charizard.png");
    expect(c[1]).toContain("/shiny/6.png");
  });
});
