"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";
import { MultiSelect, type MultiSelectOption } from "./MultiSelect";

type Species = {
  id: number;
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
  baseStats: Record<string, number>;
  catchRate: number;
  abilities: string[];
  labels: string[];
};

const TYPE_OPTIONS: MultiSelectOption[] = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting",
  "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
  "dragon", "dark", "steel", "fairy",
].map((t) => ({ value: t, label: t }));

const GEN_OPTIONS: MultiSelectOption[] = Array.from({ length: 9 }, (_, i) => ({
  value: `gen${i + 1}`,
  label: `Generation ${i + 1}`,
}));

const LABEL_OPTIONS: MultiSelectOption[] = [
  { value: "starter", label: "Starter", group: "Story" },
  { value: "legendary", label: "Legendary", group: "Story" },
  { value: "mythical", label: "Mythical", group: "Story" },
  { value: "paradox", label: "Paradox", group: "Story" },
  { value: "ultra_beast", label: "Ultra Beast", group: "Story" },
  { value: "baby", label: "Baby", group: "Evolution" },
  { value: "regional", label: "Regional variant", group: "Evolution" },
];

type SortKey = "dex" | "name" | "hp" | "attack" | "speed" | "total";

function totalStats(s: Record<string, number>): number {
  return Object.values(s).reduce((a, b) => a + b, 0);
}

function StatBar({
  label,
  value,
  max = 255,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-7 uppercase text-muted shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-subtle overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right font-mono shrink-0">{value}</span>
    </div>
  );
}

export function PokedexGrid() {
  const [results, setResults] = useState<Species[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [gens, setGens] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("dex");
  const sentinel = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback(
    (c: number | null) => {
      const u = new URLSearchParams();
      if (c && c > 0) u.set("cursor", String(c));
      if (q) u.set("q", q);
      if (types.length > 0) u.set("type", types[0]);
      if (gens.length > 0) u.set("gen", gens[0]);
      return `/api/pokedex?${u.toString()}`;
    },
    [q, types, gens],
  );

  const reset = useCallback(() => {
    setResults([]);
    setCursor(0);
    setDone(false);
  }, []);

  useEffect(() => {
    reset();
  }, [q, types, gens, labels, reset]);

  const fetchPage = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch(buildUrl(cursor));
      if (!res.ok) throw new Error("pokedex fetch failed");
      const data = (await res.json()) as { results: Species[]; nextCursor: number | null };
      // Client-side filter for multi-select types/gens + labels (API accepts
      // only one of each). We over-fetch and narrow here for now.
      const filtered = data.results.filter((s) => {
        if (
          types.length > 0 &&
          !types.includes(s.primaryType) &&
          !(s.secondaryType && types.includes(s.secondaryType))
        )
          return false;
        if (
          gens.length > 0 &&
          !(s.labels ?? []).some((l) => gens.includes(l))
        )
          return false;
        if (
          labels.length > 0 &&
          !(s.labels ?? []).some((l) => labels.includes(l))
        )
          return false;
        return true;
      });
      setResults((prev) => [...prev, ...filtered]);
      if (data.nextCursor === null) setDone(true);
      else setCursor(data.nextCursor);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, cursor, loading, done, types, gens, labels]);

  useEffect(() => {
    if (results.length === 0 && !done) fetchPage();
  }, [results.length, done, fetchPage]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage]);

  const sorted = useMemo(() => {
    const cmp: Record<SortKey, (a: Species, b: Species) => number> = {
      dex: (a, b) => a.dexNo - b.dexNo,
      name: (a, b) => a.name.localeCompare(b.name),
      hp: (a, b) => (b.baseStats.hp ?? 0) - (a.baseStats.hp ?? 0),
      attack: (a, b) => (b.baseStats.attack ?? 0) - (a.baseStats.attack ?? 0),
      speed: (a, b) => (b.baseStats.speed ?? 0) - (a.baseStats.speed ?? 0),
      total: (a, b) => totalStats(b.baseStats) - totalStats(a.baseStats),
    };
    return [...results].sort(cmp[sort]);
  }, [results, sort]);

  const clearAll = () => {
    setQ("");
    setTypes([]);
    setGens([]);
    setLabels([]);
  };

  return (
    <>
      <div className="sticky top-[57px] z-30 -mx-6 px-6 py-3 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Pokémon by name…"
            className="flex-1 min-w-48 rounded-lg border border-border bg-card px-4 py-2 outline-none focus:border-accent"
          />
          <MultiSelect
            label="Types"
            options={TYPE_OPTIONS}
            value={types}
            onChange={setTypes}
            placeholder="Any type"
          />
          <MultiSelect
            label="Gens"
            options={GEN_OPTIONS}
            value={gens}
            onChange={setGens}
            placeholder="All gens"
            searchable={false}
          />
          <MultiSelect
            label="Tag"
            options={LABEL_OPTIONS}
            value={labels}
            onChange={setLabels}
            placeholder="Any"
            searchable={false}
          />
          <label className="text-xs inline-flex items-center gap-1 text-muted">
            <span className="text-[10px] uppercase tracking-wide">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              <option value="dex">Dex number</option>
              <option value="name">Name</option>
              <option value="hp">HP</option>
              <option value="attack">Attack</option>
              <option value="speed">Speed</option>
              <option value="total">Total base stats</option>
            </select>
          </label>
          {(q || types.length > 0 || gens.length > 0 || labels.length > 0) && (
            <button
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((s) => {
          const total = totalStats(s.baseStats);
          const gen = (s.labels ?? []).find((l) => l.startsWith("gen"));
          return (
            <li key={s.id}>
              <Link
                href={`/pokemon/${s.slug}`}
                className="group relative block rounded-xl border border-border bg-card p-4 hover:bg-subtle hover:border-accent/50 transition-all overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-muted">
                    #{String(s.dexNo).padStart(4, "0")}
                  </span>
                  {gen && (
                    <span className="text-[9px] uppercase tracking-wider text-muted font-mono">
                      {gen}
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  <PokemonSprite
                    dexNo={s.dexNo}
                    name={s.name}
                    size={120}
                    className="transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="mt-1 text-center font-semibold truncate">
                  {s.name}
                </div>
                <div className="mt-1 flex justify-center min-w-0 max-w-full overflow-hidden">
                  <TypePair primary={s.primaryType} secondary={s.secondaryType} size={16} />
                </div>
                <div className="mt-3 space-y-0.5">
                  <StatBar label="hp" value={s.baseStats.hp ?? 0} />
                  <StatBar label="atk" value={s.baseStats.attack ?? 0} />
                  <StatBar label="def" value={s.baseStats.defence ?? 0} />
                  <StatBar label="spa" value={s.baseStats.special_attack ?? 0} />
                  <StatBar label="spd" value={s.baseStats.special_defence ?? 0} />
                  <StatBar label="spe" value={s.baseStats.speed ?? 0} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                  <span>Total · <span className="font-mono text-foreground">{total}</span></span>
                  <span>Catch · <span className="font-mono text-foreground">{s.catchRate}</span></span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div ref={sentinel} className="h-20 flex items-center justify-center text-xs text-muted">
        {loading ? "loading…" : done ? `${results.length} species` : ""}
      </div>
    </>
  );
}
