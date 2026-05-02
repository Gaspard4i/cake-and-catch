"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Spinner, TopProgress, PokedexCardSkeleton } from "./Loader";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";
import { MultiSelect, type MultiSelectOption } from "./MultiSelect";
import { VariantBadge } from "./VariantBadge";

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
  variantOfSpeciesId?: number | null;
  variantLabel?: string | null;
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
  { value: "variant", label: "Any alt form (mega/gmax/…)", group: "Evolution" },
];

type SortKey =
  | "dex"
  | "dex_desc"
  | "name"
  | "name_desc"
  | "hp"
  | "attack"
  | "speed"
  | "total";

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
  const t = useTranslations("pokedexUi");
  const tc = useTranslations("common");
  const [results, setResults] = useState<Species[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [gens, setGens] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("dex");
  const [shiny, setShiny] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  /**
   * Monotonically-increasing id for each fetch. Any response whose id is
   * stale (filters changed mid-flight) is dropped to avoid mixing rows from
   * different filter sets, which is what produced the "two children with the
   * same key" flood in dev.
   */
  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const buildUrl = useCallback(
    (c: string | null) => {
      const u = new URLSearchParams();
      if (c) u.set("cursor", c);
      if (q) u.set("q", q);
      // Intersection: API receives up to 2 types; a row must match ALL of
      // them (primary/secondary unordered). A Pokémon has at most 2 types so
      // we cap the selection at 2.
      for (const t of types.slice(0, 2)) u.append("type", t);
      if (gens.length > 0) u.set("gen", gens[0]);
      // Forward every label the user picked. The API treats `variant`
      // as the opt-in switch for mimic forms (mega/gmax/cosplay/…)
      // and the rest (starter, legendary, …) as narrowing filters.
      for (const l of labels) u.append("label", l);
      u.set("sort", sort);
      return `/api/pokedex?${u.toString()}`;
    },
    [q, types, gens, labels, sort],
  );

  const reset = useCallback(() => {
    reqIdRef.current += 1;
    inFlightRef.current = false;
    setResults([]);
    setCursor(null);
    setDone(false);
  }, []);

  useEffect(() => {
    reset();
  }, [q, types, gens, labels, sort, reset]);

  const fetchPage = useCallback(async () => {
    if (inFlightRef.current || done) return;
    inFlightRef.current = true;
    const myId = reqIdRef.current;
    setLoading(true);
    try {
      const res = await fetch(buildUrl(cursor));
      if (!res.ok) throw new Error("pokedex fetch failed");
      const data = (await res.json()) as { results: Species[]; nextCursor: string | null };
      // Stale response: filters changed while we were fetching. Drop it.
      if (myId !== reqIdRef.current) return;
      const filtered = data.results.filter((s) => {
        if (types.length > 0) {
          // Intersection: every selected type must be one of the two types.
          const own = [s.primaryType, s.secondaryType].filter(
            (t): t is string => !!t,
          );
          if (!types.every((t) => own.includes(t))) return false;
        }
        if (
          gens.length > 0 &&
          !(s.labels ?? []).some((l) => gens.includes(l))
        )
          return false;
        // Labels semantics:
        //   - `variant` is an opt-in switch for mimic forms; the API
        //     already widened the result, no client filter needed.
        //   - Every other label narrows to rows that carry it.
        const narrowing = labels.filter((l) => l !== "variant");
        if (
          narrowing.length > 0 &&
          !narrowing.every((l) => (s.labels ?? []).includes(l))
        )
          return false;
        return true;
      });
      // Merge with existing, deduplicating by id. Guards against the same
      // cursor being fetched twice in rapid succession (observer re-fire,
      // React strict-mode double-invoke in dev).
      setResults((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        const next = prev.slice();
        for (const s of filtered) {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            next.push(s);
          }
        }
        return next;
      });
      if (data.nextCursor === null) setDone(true);
      else setCursor(data.nextCursor);
    } catch {
      if (myId === reqIdRef.current) setDone(true);
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
      inFlightRef.current = false;
    }
  }, [buildUrl, cursor, done, types, gens, labels]);

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

  // Sort is applied server-side via the `sort` query param and keyset cursor.
  // We keep results in the order the API returned them — this guarantees the
  // sort spans the whole dataset, not just the currently loaded page.
  const sorted = results;

  const clearAll = () => {
    setQ("");
    setTypes([]);
    setGens([]);
    setLabels([]);
  };

  return (
    <>
      <TopProgress active={loading} />
      <div className="sticky top-[57px] z-30 -mx-6 px-6 py-3 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 min-w-48 rounded-lg border border-border bg-card px-4 py-2 outline-none focus:border-accent"
          />
          <MultiSelect
            label={t("types")}
            options={TYPE_OPTIONS}
            value={types}
            onChange={setTypes}
            placeholder={t("typesAny")}
            maxSelection={2}
          />
          <MultiSelect
            label={t("gens")}
            options={GEN_OPTIONS}
            value={gens}
            onChange={setGens}
            placeholder={t("gensAny")}
            searchable={false}
          />
          <MultiSelect
            label={t("tag")}
            options={LABEL_OPTIONS}
            value={labels}
            onChange={setLabels}
            placeholder={t("tagAny")}
            searchable={false}
          />
          <label className="text-xs inline-flex items-center gap-1 text-muted">
            <span className="text-[10px] uppercase tracking-wide">{tc("sort")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              <option value="dex">{t("sortDex")}</option>
              <option value="dex_desc">{t("sortDexDesc")}</option>
              <option value="name">{t("sortName")}</option>
              <option value="name_desc">{t("sortNameDesc")}</option>
              <option value="hp">{t("sortHp")}</option>
              <option value="attack">{t("sortAttack")}</option>
              <option value="speed">{t("sortSpeed")}</option>
              <option value="total">{t("sortTotal")}</option>
            </select>
          </label>
          <button
            onClick={() => setShiny((v) => !v)}
            aria-pressed={shiny}
            className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${
              shiny
                ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                : "border-border text-muted hover:text-foreground"
            }`}
            title={t("shinyTitle")}
          >
            <Star
              className={`h-3.5 w-3.5 ${shiny ? "text-amber-500 fill-amber-500" : ""}`}
              aria-hidden
            />
            <span className="text-[10px] uppercase tracking-wide">{t("shiny")}</span>
          </button>
          {(q || types.length > 0 || gens.length > 0 || labels.length > 0) && (
            <button
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
            >
              {tc("clearAll")}
            </button>
          )}
          {loading && <Spinner label="loading" />}
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
        {loading && results.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <li key={`sk-${i}`}>
                <PokedexCardSkeleton />
              </li>
            ))
          : null}
        {sorted.map((s) => {
          const total = totalStats(s.baseStats);
          const gen = (s.labels ?? []).find((l) => l.startsWith("gen"));
          return (
            <li key={s.id}>
              <Link
                href={`/pokemon/${s.slug}`}
                className="group relative block rounded-lg sm:rounded-xl border border-border bg-card p-1.5 sm:p-4 hover:bg-subtle hover:border-accent/50 transition-all overflow-hidden"
              >
                <div className="hidden sm:flex items-start justify-between gap-2">
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
                    variantLabel={(s as { variantLabel?: string | null }).variantLabel}
                    size={120}
                    shiny={shiny}
                    className="transition-transform group-hover:scale-110 size-16 sm:size-[120px] object-contain"
                  />
                </div>
                <div className="mt-0.5 sm:mt-1 text-center font-semibold truncate text-[11px] sm:text-base">
                  {s.name}
                </div>
                {s.variantLabel && (
                  <div className="mt-0.5 flex justify-center">
                    <VariantBadge variantLabel={s.variantLabel} />
                  </div>
                )}
                <div className="mt-0.5 text-center font-mono text-[9px] text-muted sm:hidden">
                  #{String(s.dexNo).padStart(4, "0")}
                </div>
                <div className="hidden sm:flex mt-1 justify-center min-w-0 max-w-full overflow-hidden">
                  <TypePair primary={s.primaryType} secondary={s.secondaryType} size={16} />
                </div>
                <div className="hidden sm:block mt-3 space-y-0.5">
                  <StatBar label="hp" value={s.baseStats.hp ?? 0} />
                  <StatBar label="atk" value={s.baseStats.attack ?? 0} />
                  <StatBar label="def" value={s.baseStats.defence ?? 0} />
                  <StatBar label="spa" value={s.baseStats.special_attack ?? 0} />
                  <StatBar label="spd" value={s.baseStats.special_defence ?? 0} />
                  <StatBar label="spe" value={s.baseStats.speed ?? 0} />
                </div>
                <div className="hidden sm:flex mt-2 items-center justify-between text-[10px] text-muted">
                  <span>{t("total")} · <span className="font-mono text-foreground">{total}</span></span>
                  <span>{t("catch")} · <span className="font-mono text-foreground">{s.catchRate}</span></span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div ref={sentinel} className="h-20 flex items-center justify-center text-xs text-muted">
        {loading
          ? <Spinner label={tc("loading")} />
          : done
            ? t("speciesCount", { count: results.length })
            : ""}
      </div>
    </>
  );
}
