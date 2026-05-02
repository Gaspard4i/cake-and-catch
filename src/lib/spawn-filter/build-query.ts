/**
 * Single-pass SQL matcher: given a player's filter selection, return
 * the species rows whose spawn pool fits.
 *
 * Sémantique :
 *   - Filter axis UNSET → ignore that axis (the player did not
 *     constrain it).
 *   - Filter axis SET, spawn axis empty/null → keep the spawn (no
 *     spawn-side constraint on that axis).
 *   - Both set → require an intersection / equality.
 *
 * The whole thing leans on JSONB `?|` (any-overlap) operators backed
 * by GIN indexes on `condition_dimensions`, `condition_biome_tags`,
 * `condition_structures`. See migration 0012.
 */
import { SQL, sql } from "drizzle-orm";

export type SpawnFilterInput = {
  dimensions?: string[];
  biomeTags?: string[];
  structures?: string[];
  positionTypes?: string[];
  buckets?: Array<"common" | "uncommon" | "rare" | "ultra-rare">;
  timeRange?: string;
  isRaining?: boolean;
  isThundering?: boolean;
  canSeeSky?: boolean;
  moonPhase?: number;
  lightLevel?: number;
  skyLightLevel?: number;
  yLevel?: number;
  fluid?: string;
  /** Restrict to spawns from listed sources. Defaults to ['cobblemon']. */
  sources?: string[];
};

const ARRAY_AXIS_MAP: Array<{
  filterKey: keyof SpawnFilterInput;
  column: string;
}> = [
  { filterKey: "dimensions", column: "condition_dimensions" },
  { filterKey: "biomeTags", column: "condition_biome_tags" },
  { filterKey: "structures", column: "condition_structures" },
];

/**
 * Build the WHERE expression piece-by-piece. Returns a Drizzle SQL
 * fragment ready to feed into a `db.execute(sql\`SELECT … WHERE \${...}\`)`.
 */
export function buildSpawnWhere(filter: SpawnFilterInput): SQL {
  const clauses: SQL[] = [sql`true`];

  // JSONB string-array axes: filter has values → spawn must overlap or
  // be empty (no constraint).
  for (const { filterKey, column } of ARRAY_AXIS_MAP) {
    const v = filter[filterKey] as string[] | undefined;
    if (!v || v.length === 0) continue;
    const arrayJson = JSON.stringify(v);
    clauses.push(sql`(
      jsonb_array_length(spawns.${sql.raw(column)}) = 0
      OR spawns.${sql.raw(column)} ?| ${v}
      OR spawns.${sql.raw(column)} @> ${arrayJson}::jsonb
    )`);
  }

  if (filter.positionTypes && filter.positionTypes.length > 0) {
    clauses.push(
      sql`(spawns.position_type IS NULL OR spawns.position_type = ANY(${filter.positionTypes}::text[]))`,
    );
  }

  if (filter.buckets && filter.buckets.length > 0) {
    clauses.push(sql`spawns.bucket = ANY(${filter.buckets}::bucket[])`);
  }

  if (typeof filter.timeRange === "string" && filter.timeRange.length > 0) {
    clauses.push(
      sql`(spawns.time_range IS NULL OR spawns.time_range IN ('any', ${filter.timeRange}))`,
    );
  }
  if (typeof filter.isRaining === "boolean") {
    clauses.push(
      sql`(spawns.requires_rain IS NULL OR spawns.requires_rain = ${filter.isRaining})`,
    );
  }
  if (typeof filter.isThundering === "boolean") {
    clauses.push(
      sql`(spawns.requires_thunder IS NULL OR spawns.requires_thunder = ${filter.isThundering})`,
    );
  }
  if (typeof filter.canSeeSky === "boolean") {
    clauses.push(
      sql`(spawns.requires_can_see_sky IS NULL OR spawns.requires_can_see_sky = ${filter.canSeeSky})`,
    );
  }
  if (typeof filter.moonPhase === "number") {
    clauses.push(sql`(
      spawns.min_moon_phase IS NULL
      OR ${filter.moonPhase} BETWEEN spawns.min_moon_phase AND spawns.max_moon_phase
    )`);
  }
  if (typeof filter.lightLevel === "number") {
    clauses.push(sql`(
      ${filter.lightLevel} BETWEEN COALESCE(spawns.min_light, 0) AND COALESCE(spawns.max_light, 15)
    )`);
  }
  if (typeof filter.skyLightLevel === "number") {
    clauses.push(sql`(
      ${filter.skyLightLevel} BETWEEN COALESCE(spawns.min_sky_light, 0) AND COALESCE(spawns.max_sky_light, 15)
    )`);
  }
  if (typeof filter.yLevel === "number") {
    clauses.push(sql`(
      ${filter.yLevel} BETWEEN COALESCE(spawns.min_y, -64) AND COALESCE(spawns.max_y, 320)
    )`);
  }
  if (filter.fluid) {
    clauses.push(sql`(spawns.fluid IS NULL OR spawns.fluid = ${filter.fluid})`);
  }
  const sources =
    filter.sources && filter.sources.length > 0 ? filter.sources : ["cobblemon"];
  clauses.push(sql`spawns.source_name = ANY(${sources}::text[])`);

  // Combine.
  return clauses.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`));
}
