import { describe, it, expect } from "vitest";
import { readFilters } from "@/lib/url-state";

const descriptor = {
  scalars: ["q", "gen", "sort"],
  multi: ["type", "label"],
  bools: ["shiny", "alt"],
} as const;

describe("readFilters", () => {
  it("returns null for absent scalars and empty arrays for absent multis", () => {
    const f = readFilters(descriptor, new URLSearchParams());
    expect(f.q).toBeNull();
    expect(f.gen).toBeNull();
    expect(f.type).toEqual([]);
    expect(f.shiny).toBe(false);
  });

  it("collects every occurrence of multi params", () => {
    const f = readFilters(
      descriptor,
      new URLSearchParams("type=fire&type=flying&label=starter"),
    );
    expect(f.type).toEqual(["fire", "flying"]);
    expect(f.label).toEqual(["starter"]);
  });

  it("treats `1` and `true` as boolean true", () => {
    expect(readFilters(descriptor, new URLSearchParams("shiny=1")).shiny).toBe(true);
    expect(readFilters(descriptor, new URLSearchParams("shiny=true")).shiny).toBe(true);
    expect(readFilters(descriptor, new URLSearchParams("shiny=0")).shiny).toBe(false);
  });
});
