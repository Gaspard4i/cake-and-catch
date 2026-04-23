"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PokemonSprite } from "./PokemonSprite";
import { SourceBadge } from "./SourceBadge";
import { TypePair } from "./TypeBadge";

export type BiomeSpawnEntry = {
  spawnId: number;
  speciesId: number;
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
  bucket: "common" | "uncommon" | "rare" | "ultra-rare";
  weight: number;
  levelMin: number;
  levelMax: number;
  sourceKind: "mod" | "wiki" | "derived" | "addon";
  sourceName: string;
  sourceUrl: string | null;
  condition: unknown;
};

const BUCKETS = ["common", "uncommon", "rare", "ultra-rare"] as const;

const BUCKET_COLOR: Record<string, string> = {
  common: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  uncommon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rare: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "ultra-rare": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

type SortKey = "chance" | "weight" | "dex" | "name";

/**
 * Cobblemon spawns within the same (biome, rarity bucket) are drawn from a
 * pool where each entry's `weight` is relative to the other entries in that
 * same bucket. The spawn chance for a given entry, conditional on the
 * bucket being picked, is `weight / sumOfWeightsInBucket`.
 */
function computeChances(entries: BiomeSpawnEntry[]): Map<number, number> {
  const totals: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    "ultra-rare": 0,
  };
  for (const e of entries) totals[e.bucket] += e.weight;
  const out = new Map<number, number>();
  for (const e of entries) {
    const total = totals[e.bucket] || 1;
    out.set(e.spawnId, e.weight / total);
  }
  return out;
}

export function BiomeSpawnList({ entries }: { entries: BiomeSpawnEntry[] }) {
  const [activeBuckets, setActiveBuckets] = useState<Set<string>>(new Set());
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("chance");
  const [query, setQuery] = useState("");

  const chances = useMemo(() => computeChances(entries), [entries]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) s.add(e.sourceName);
    return [...s].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (activeBuckets.size > 0) list = list.filter((e) => activeBuckets.has(e.bucket));
    if (activeSources.size > 0) list = list.filter((e) => activeSources.has(e.sourceName));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    const cmp: Record<SortKey, (a: BiomeSpawnEntry, b: BiomeSpawnEntry) => number> = {
      chance: (a, b) => (chances.get(b.spawnId) ?? 0) - (chances.get(a.spawnId) ?? 0),
      weight: (a, b) => b.weight - a.weight,
      dex: (a, b) => a.dexNo - b.dexNo,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(cmp[sortKey]);
  }, [entries, activeBuckets, activeSources, query, chances, sortKey]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.bucket] = (counts[e.bucket] ?? 0) + 1;
    return counts;
  }, [entries]);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="flex-1 min-w-52 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <label className="text-xs flex items-center gap-1 text-muted">
          <span>Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            <option value="chance">Chance in bucket</option>
            <option value="weight">Raw weight</option>
            <option value="dex">Dex number</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-muted mr-1">Rarity</span>
        {BUCKETS.map((b) => {
          const active = activeBuckets.has(b);
          const count = bucketCounts[b] ?? 0;
          return (
            <button
              key={b}
              onClick={() => toggle(activeBuckets, setActiveBuckets, b)}
              disabled={count === 0}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? `${BUCKET_COLOR[b]} border-transparent font-medium`
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {b} ({count})
            </button>
          );
        })}
        {activeBuckets.size > 0 && (
          <button
            onClick={() => setActiveBuckets(new Set())}
            className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
          >
            clear
          </button>
        )}
      </div>

      {sources.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted mr-1">Source</span>
          {sources.map((s) => {
            const active = activeSources.has(s);
            return (
              <button
                key={s}
                onClick={() => toggle(activeSources, setActiveSources, s)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border bg-card text-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
          {activeSources.size > 0 && (
            <button
              onClick={() => setActiveSources(new Set())}
              className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Showing <span className="text-foreground font-medium">{filtered.length}</span>{" "}
        of {entries.length} spawns. Spawn chance is relative to other entries
        sharing the same rarity bucket, assuming that bucket is rolled.
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No spawn matches these filters.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const pct = (chances.get(s.spawnId) ?? 0) * 100;
            return (
              <li
                key={s.spawnId}
                className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <Link
                    href={`/pokemon/${s.slug}`}
                    className="flex items-center gap-3 min-w-0 flex-1 hover:text-accent transition-colors"
                  >
                    <PokemonSprite dexNo={s.dexNo} name={s.name} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] text-muted">
                        #{String(s.dexNo).padStart(4, "0")}
                      </div>
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="mt-0.5 min-w-0 max-w-full overflow-hidden">
                        <TypePair
                          primary={s.primaryType}
                          secondary={s.secondaryType}
                          size={14}
                        />
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium capitalize ${BUCKET_COLOR[s.bucket] ?? ""}`}
                  >
                    {s.bucket}
                  </span>
                  <span className="font-mono text-foreground">
                    {pct >= 0.1 ? pct.toFixed(1) : pct.toFixed(2)}%
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-subtle overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>
                    Lv {s.levelMin}–{s.levelMax} · w {s.weight}
                  </span>
                  <SourceBadge
                    kind={s.sourceKind === "addon" ? "addon" : "mod"}
                    name={s.sourceName}
                    href={s.sourceUrl ?? undefined}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
