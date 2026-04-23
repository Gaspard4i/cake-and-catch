"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";

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

const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting",
  "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
  "dragon", "dark", "steel", "fairy",
];

const GENS = ["gen1", "gen2", "gen3", "gen4", "gen5", "gen6", "gen7", "gen8", "gen9"];

function StatBars({ stats }: { stats: Record<string, number> }) {
  const max = 255;
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="flex items-center gap-1">
          <span className="w-6 uppercase text-muted">{k.slice(0, 3)}</span>
          <div className="flex-1 h-1.5 rounded-full bg-subtle overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(100, (v / max) * 100)}%` }}
            />
          </div>
          <span className="w-6 text-right font-mono">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function PokedexGrid() {
  const [results, setResults] = useState<Species[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [gen, setGen] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback(
    (c: number | null) => {
      const u = new URLSearchParams();
      if (c && c > 0) u.set("cursor", String(c));
      if (q) u.set("q", q);
      if (type) u.set("type", type);
      if (gen) u.set("gen", gen);
      return `/api/pokedex?${u.toString()}`;
    },
    [q, type, gen],
  );

  const reset = useCallback(() => {
    setResults([]);
    setCursor(0);
    setDone(false);
  }, []);

  // Reset when filters change
  useEffect(() => {
    reset();
  }, [q, type, gen, reset]);

  // Fetcher
  const fetchPage = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch(buildUrl(cursor));
      if (!res.ok) throw new Error("pokedex fetch failed");
      const data = (await res.json()) as { results: Species[]; nextCursor: number | null };
      setResults((prev) => [...prev, ...data.results]);
      if (data.nextCursor === null) setDone(true);
      else setCursor(data.nextCursor);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, cursor, loading, done]);

  // First page load after reset
  useEffect(() => {
    if (results.length === 0 && !done) {
      fetchPage();
    }
  }, [results.length, done, fetchPage]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage]);

  const queryDebounced = useDebounced(q, 200);
  useEffect(() => {
    // when debounced value differs from current q mounted to URL, we already handle via state
  }, [queryDebounced]);

  return (
    <>
      <div className="sticky top-[57px] z-30 -mx-6 px-6 py-3 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            <button
              onClick={() => setType("")}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                type === ""
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted hover:text-foreground"
              }`}
            >
              all types
            </button>
            {TYPES.map((tp) => (
              <button
                key={tp}
                onClick={() => setType(type === tp ? "" : tp)}
                className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                  type === tp
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-muted hover:text-foreground"
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGen("")}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                gen === ""
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted hover:text-foreground"
              }`}
            >
              all gens
            </button>
            {GENS.map((g) => (
              <button
                key={g}
                onClick={() => setGen(gen === g ? "" : g)}
                className={`text-xs px-2 py-0.5 rounded-full border uppercase ${
                  gen === g
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-muted hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {results.map((s) => (
          <li key={s.id}>
            <Link
              href={`/pokemon/${s.slug}`}
              className="block rounded-lg border border-border bg-card p-3 hover:bg-subtle hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <PokemonSprite dexNo={s.dexNo} name={s.name} size={72} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">
                      #{String(s.dexNo).padStart(4, "0")}
                    </span>
                    <span className="text-[10px] uppercase text-muted">
                      {(s.labels ?? []).find((l) => l.startsWith("gen")) ?? ""}
                    </span>
                  </div>
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="mt-1">
                    <TypePair primary={s.primaryType} secondary={s.secondaryType} size={18} />
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <StatBars stats={s.baseStats} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={sentinel} className="h-16 flex items-center justify-center text-xs text-muted">
        {loading ? "loading…" : done ? `${results.length} species` : ""}
      </div>
    </>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
