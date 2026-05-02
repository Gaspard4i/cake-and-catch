import { describe, it, expect } from "vitest";
import { buildSpawnWhere } from "@/lib/spawn-filter/build-query";

/**
 * Unit-test the SQL fragment shape: we don't actually hit the DB
 * here, we just check that the builder emits the right gates for
 * each combination of inputs. Integration tests sit alongside the
 * ingest output in the dev environment.
 */
describe("buildSpawnWhere", () => {
  function fragment(input: Parameters<typeof buildSpawnWhere>[0]): string {
    const sql = buildSpawnWhere(input);
    // Drizzle's SQL has a `.queryChunks` array — we coerce to a
    // string by reading the chunks. We just want the rendered SQL
    // shape, not the params.
    return JSON.stringify(sql);
  }

  it("always anchors the source filter to ['cobblemon'] by default", () => {
    const f = fragment({});
    expect(f).toContain("source_name");
    expect(f).toContain("cobblemon");
  });

  it("adds dimension overlap gate when dimensions are set", () => {
    const f = fragment({ dimensions: ["minecraft:the_nether"] });
    expect(f).toContain("condition_dimensions");
    expect(f).toContain("the_nether");
  });

  it("does NOT emit the biome gate when no biomeTags given", () => {
    const f = fragment({ dimensions: ["minecraft:overworld"] });
    expect(f).not.toContain("condition_biome_tags");
  });

  it("emits a moon-phase BETWEEN gate", () => {
    const f = fragment({ moonPhase: 4 });
    expect(f).toContain("min_moon_phase");
    expect(f).toContain("max_moon_phase");
  });

  it("emits requires_rain only when explicitly set", () => {
    expect(fragment({ isRaining: true })).toContain("requires_rain");
    expect(fragment({})).not.toContain("requires_rain");
  });

  it("respects an explicit sources override", () => {
    const f = fragment({ sources: ["cobblemon", "myaddon"] });
    expect(f).toContain("myaddon");
  });

  it("emits the time_range any-or-equals gate", () => {
    const f = fragment({ timeRange: "night" });
    expect(f).toContain("time_range");
    expect(f).toContain("night");
  });
});
