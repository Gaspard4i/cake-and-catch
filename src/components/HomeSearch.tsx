"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";

type PokemonSuggestion = {
  kind: "pokemon";
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
};

type BiomeSuggestion = {
  kind: "biome";
  key: string;
  label: string;
};

type Suggestion = PokemonSuggestion | BiomeSuggestion;

/**
 * Universal search bar for the landing page. Searches both Cobblemon (via
 * /api/suggest) and biomes (static list derived from Cobblemon biome tags).
 * Selecting a result navigates to the relevant page.
 */

const KNOWN_BIOMES: Array<{ key: string; label: string }> = [
  { key: "cobblemon:is_plains", label: "Plains" },
  { key: "cobblemon:is_forest", label: "Forest" },
  { key: "cobblemon:is_jungle", label: "Jungle" },
  { key: "cobblemon:is_savanna", label: "Savanna" },
  { key: "cobblemon:is_desert", label: "Desert" },
  { key: "cobblemon:is_ocean", label: "Ocean" },
  { key: "cobblemon:is_beach", label: "Beach" },
  { key: "cobblemon:is_mountain", label: "Mountain" },
  { key: "cobblemon:is_snowy", label: "Snowy" },
  { key: "cobblemon:is_swamp", label: "Swamp" },
  { key: "cobblemon:is_river", label: "River" },
  { key: "cobblemon:is_cave", label: "Cave" },
  { key: "cobblemon:is_nether", label: "Nether" },
  { key: "cobblemon:is_end", label: "End" },
  { key: "cobblemon:is_tropical_island", label: "Tropical island" },
  { key: "cobblemon:is_volcanic", label: "Volcanic" },
  { key: "cobblemon:is_badlands", label: "Badlands" },
  { key: "cobblemon:is_taiga", label: "Taiga" },
  { key: "cobblemon:is_wasteland", label: "Wasteland" },
];

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const [pkRes, biomeResults] = await Promise.all([
          fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
            .then((r) => r.json() as Promise<{ results: Omit<PokemonSuggestion, "kind">[] }>)
            .catch(() => ({ results: [] })),
          Promise.resolve(
            KNOWN_BIOMES.filter((b) =>
              b.label.toLowerCase().includes(q.toLowerCase()),
            ),
          ),
        ]);
        const merged: Suggestion[] = [
          ...pkRes.results.slice(0, 6).map((r) => ({ ...r, kind: "pokemon" as const })),
          ...biomeResults.slice(0, 4).map((b) => ({ ...b, kind: "biome" as const })),
        ];
        setResults(merged);
        setHighlight(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (s: Suggestion) => {
    if (s.kind === "pokemon") window.location.assign(`/pokemon/${s.slug}`);
    else window.location.assign(`/biome/${encodeURIComponent(s.key)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter" && highlight >= 0 && results[highlight]) {
      e.preventDefault();
      go(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length > 0 && (loading || results.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search a Cobblemon or a biome — pikachu, victini, savanna…"
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3.5 text-base outline-none focus:border-accent focus:ring-4 focus:ring-ring/20 transition-colors"
        />
      </div>

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-40 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-[28rem] overflow-y-auto"
        >
          {loading && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">…</li>
          )}
          {results.map((r, i) => {
            const active = highlight === i;
            return r.kind === "pokemon" ? (
              <li key={`p-${r.slug}`}>
                <Link
                  href={`/pokemon/${r.slug}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                    active ? "bg-subtle" : "hover:bg-subtle"
                  }`}
                >
                  <PokemonSprite dexNo={r.dexNo} name={r.name} size={32} />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted shrink-0">
                      #{String(r.dexNo).padStart(4, "0")}
                    </span>
                    <span className="truncate">{r.name}</span>
                  </div>
                  <TypePair primary={r.primaryType} secondary={r.secondaryType} size={16} />
                </Link>
              </li>
            ) : (
              <li key={`b-${r.key}`}>
                <Link
                  href={`/biome/${encodeURIComponent(r.key)}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                    active ? "bg-subtle" : "hover:bg-subtle"
                  }`}
                >
                  <span className="size-8 rounded-md bg-subtle flex items-center justify-center text-xs uppercase text-muted font-medium">
                    🌍
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block text-[10px] text-muted font-mono">{r.key}</span>
                  </span>
                  <span className="text-[10px] uppercase text-muted">biome</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
