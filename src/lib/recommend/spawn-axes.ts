/**
 * Cross-axis filter compatibility for the snack maker.
 *
 * Given the full set of spawns and the filters the user has already
 * picked, we recompute every other axis's available values: only the
 * options reachable through at least one spawn that satisfies the
 * already-set axes are considered "still selectable".
 *
 * This is what makes "cave dimension → biomes shrink to nether biomes"
 * and "covered sky → moon phase greys out" feel consistent — every
 * filter constrains every other.
 */

export type SpawnAxis = {
  src: string;
  bk: string;
  ctx: string | null;
  bio: string[];
  dim: string[];
  str: string[];
  tr: string | null;
  mp: number | null;
  r: boolean | null;
  th: boolean | null;
  sky: boolean | null;
  light: [number, number] | null;
  slight: [number, number] | null;
};

export type AxisFilter = {
  sources?: string[];
  buckets?: string[];
  contexts?: string[];
  biomes?: string[];
  dimensions?: string[];
  structures?: string[];
  timeRanges?: string[];
  moonPhase?: number;
  weather?: "clear" | "rain" | "thunder";
  skyExposure?: "open" | "covered" | "cave";
  lightLevel?: number;
  /** When supplied, the dropdowns only consider biomes whose namespace
   *  is in this allow-list. Used to reflect the "Mods" picker. */
  namespaces?: string[];
};

function stripHash(s: string): string {
  return s.replace(/^#/, "");
}

function biomeNamespace(b: string): string {
  const stripped = stripHash(b);
  const i = stripped.indexOf(":");
  return i >= 0 ? stripped.slice(0, i) : "";
}

function inSet(values: string[] | undefined, candidate: string): boolean {
  if (!values || values.length === 0) return true;
  const set = new Set(values.map(stripHash));
  return set.has(stripHash(candidate));
}

function intersects(a: string[], b: string[] | undefined): boolean {
  if (!b || b.length === 0) return true;
  if (a.length === 0) return false;
  const set = new Set(b.map(stripHash));
  return a.some((x) => set.has(stripHash(x)));
}

/**
 * Returns true when `axis` could plausibly correspond to the player's
 * current filter selection. Each filter axis is treated as an inclusion
 * constraint: if the player picks rain, only spawns whose `r` is true
 * or null (no constraint) qualify.
 *
 * `ignore` lets the caller skip one axis when computing the options for
 * THAT axis (a control should never grey itself out).
 */
function axisMatchesFilter(
  axis: SpawnAxis,
  filter: AxisFilter,
  ignore?: keyof AxisFilter,
): boolean {
  if (ignore !== "sources" && filter.sources && filter.sources.length > 0) {
    if (!filter.sources.includes(axis.src)) return false;
  }
  if (ignore !== "buckets" && filter.buckets && filter.buckets.length > 0) {
    if (!filter.buckets.includes(axis.bk)) return false;
  }
  if (ignore !== "contexts" && filter.contexts && filter.contexts.length > 0) {
    const ctx = axis.ctx ?? "grounded";
    if (!filter.contexts.includes(ctx)) return false;
  }
  if (ignore !== "biomes" && filter.biomes && filter.biomes.length > 0) {
    if (!intersects(axis.bio, filter.biomes)) return false;
  }
  if (ignore !== "namespaces" && filter.namespaces && filter.namespaces.length > 0) {
    // A spawn passes the namespace filter when at least one of its
    // biomes belongs to an allowed namespace, OR when it has no biome
    // (rare, but it still spawns somewhere).
    if (axis.bio.length > 0) {
      const allow = new Set(filter.namespaces);
      if (!axis.bio.some((b) => allow.has(biomeNamespace(b)))) return false;
    }
  }
  if (ignore !== "dimensions" && filter.dimensions && filter.dimensions.length > 0) {
    if (axis.dim.length > 0 && !intersects(axis.dim, filter.dimensions)) return false;
  }
  if (ignore !== "structures" && filter.structures && filter.structures.length > 0) {
    if (axis.str.length > 0 && !intersects(axis.str, filter.structures)) return false;
  }
  if (ignore !== "timeRanges" && filter.timeRanges && filter.timeRanges.length > 0) {
    if (axis.tr !== null && !filter.timeRanges.includes(axis.tr)) return false;
  }
  if (ignore !== "moonPhase" && typeof filter.moonPhase === "number") {
    if (axis.mp !== null && axis.mp !== filter.moonPhase) return false;
  }
  if (ignore !== "weather" && filter.weather) {
    if (filter.weather === "rain" && axis.r === false) return false;
    if (filter.weather === "thunder" && axis.th === false) return false;
    if (filter.weather === "clear" && (axis.r === true || axis.th === true)) return false;
  }
  if (ignore !== "skyExposure" && filter.skyExposure) {
    if (filter.skyExposure === "open" && axis.sky === false) return false;
    if (filter.skyExposure === "covered" && axis.sky === true) return false;
    if (filter.skyExposure === "cave") {
      if (axis.sky === true) return false;
      if (axis.slight && axis.slight[0] > 0) return false;
    }
  }
  if (ignore !== "lightLevel" && typeof filter.lightLevel === "number") {
    if (axis.light) {
      if (filter.lightLevel < axis.light[0] || filter.lightLevel > axis.light[1]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Build the union of unique values present on the given axis among
 * spawns that already satisfy every OTHER filter axis.
 */
export function availableValues(
  axes: SpawnAxis[],
  filter: AxisFilter,
  axis: keyof AxisFilter,
): Set<string> {
  const out = new Set<string>();
  for (const a of axes) {
    if (!axisMatchesFilter(a, filter, axis)) continue;
    switch (axis) {
      case "sources":
        out.add(a.src);
        break;
      case "buckets":
        out.add(a.bk);
        break;
      case "contexts":
        if (a.ctx) out.add(a.ctx);
        else out.add("grounded");
        break;
      case "biomes":
        for (const b of a.bio) out.add(stripHash(b));
        break;
      case "namespaces":
        for (const b of a.bio) {
          const ns = biomeNamespace(b);
          if (ns) out.add(ns);
        }
        break;
      case "dimensions":
        for (const d of a.dim) out.add(d);
        break;
      case "structures":
        for (const s of a.str) out.add(stripHash(s));
        break;
      case "timeRanges":
        if (a.tr) out.add(a.tr);
        break;
      case "moonPhase":
        if (a.mp !== null) out.add(String(a.mp));
        break;
      case "weather": {
        if (a.r === true) out.add("rain");
        if (a.th === true) out.add("thunder");
        if (a.r === false && a.th === false) out.add("clear");
        if (a.r === null && a.th === null) {
          out.add("clear");
          out.add("rain");
          out.add("thunder");
        }
        break;
      }
      case "skyExposure":
        if (a.sky === true) out.add("open");
        else if (a.sky === false) out.add("covered");
        else {
          out.add("open");
          out.add("covered");
        }
        if (a.slight && a.slight[1] === 0) out.add("cave");
        break;
      case "lightLevel":
        // Surface every endpoint of the spawn's light range; coarse
        // enough to feed a numeric input's hint set.
        if (a.light) {
          out.add(String(a.light[0]));
          out.add(String(a.light[1]));
        }
        break;
    }
  }
  return out;
}
