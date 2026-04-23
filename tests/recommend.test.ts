import { describe, it, expect } from "vitest";
import { rankBaitsFor, topBaits } from "@/lib/recommend/bait";
import type { BaitEffect } from "@/lib/db/schema";

function b(slug: string, effects: Array<Record<string, unknown>>): BaitEffect {
  return {
    id: 0,
    itemId: `cobblemon:${slug}`,
    slug,
    effects,
    raw: {},
  };
}

describe("rankBaitsFor", () => {
  it("ranks shiny > hidden ability > nature > baseline", () => {
    const baits = [
      b("plain", []),
      b("nature", [{ type: "cobblemon:nature", chance: 0.5, value: 0, subcategory: "spd" }]),
      b("ha", [{ type: "cobblemon:hidden_ability", chance: 0.25 }]),
      b("shiny", [{ type: "cobblemon:shiny_reroll", chance: 0.1 }]),
    ];
    const ranked = rankBaitsFor(baits, { primaryType: "grass" });
    expect(ranked.map((r) => r.slug)).toEqual(["shiny", "ha", "nature", "plain"]);
  });

  it("marks plain baits as baseline", () => {
    const ranked = rankBaitsFor([b("plain", [])], { primaryType: "grass" });
    expect(ranked[0].reasons).toContain("baseline");
    expect(ranked[0].score).toBe(0);
  });

  it("cumulates multiple effects", () => {
    const combo = b("combo", [
      { type: "cobblemon:nature", chance: 0.5, value: 0 },
      { type: "cobblemon:level", chance: 0.3 },
    ]);
    const ranked = rankBaitsFor([combo], { primaryType: "grass" });
    expect(ranked[0].score).toBeGreaterThan(2);
    expect(ranked[0].reasons).toEqual(["nature_boost", "level_boost"]);
  });
});

describe("topBaits", () => {
  it("limits results", () => {
    const baits = Array.from({ length: 10 }, (_, i) =>
      b(`b${i}`, [{ type: "cobblemon:nature", chance: i / 10 }]),
    );
    const top = topBaits(baits, { primaryType: "grass", limit: 3 });
    expect(top).toHaveLength(3);
    expect(top[0].slug).toBe("b9");
  });
});
