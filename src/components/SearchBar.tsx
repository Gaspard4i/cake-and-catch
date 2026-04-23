"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TypePair } from "./TypeBadge";
import { PokemonSprite } from "./PokemonSprite";

type Suggestion = {
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
};

export function SearchBar({
  defaultValue = "",
  autoFocus = false,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("suggest failed");
        const data = (await res.json()) as { results: Suggestion[] };
        setResults(data.results);
        setHighlight(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
      router.push(`/pokemon/${results[highlight].slug}`);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && value.trim().length > 0 && (loading || results.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <form method="get" action="/search" className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            autoFocus={autoFocus}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 pr-24 outline-none focus:border-accent focus:ring-2 focus:ring-ring/30 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("submit")}
          </button>
        </div>
      </form>

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-40 rounded-lg border border-border bg-card shadow-lg overflow-hidden max-h-96 overflow-y-auto"
        >
          {loading && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">…</li>
          )}
          {results.map((r, i) => (
            <li key={r.slug}>
              <Link
                href={`/pokemon/${r.slug}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors ${
                  highlight === i ? "bg-subtle" : "hover:bg-subtle"
                }`}
                role="option"
                aria-selected={highlight === i}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <PokemonSprite dexNo={r.dexNo} name={r.name} size={28} />
                  <span className="font-mono text-xs text-muted shrink-0">
                    #{String(r.dexNo).padStart(4, "0")}
                  </span>
                  <span className="truncate">{r.name}</span>
                </span>
                <TypePair primary={r.primaryType} secondary={r.secondaryType} size={20} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
