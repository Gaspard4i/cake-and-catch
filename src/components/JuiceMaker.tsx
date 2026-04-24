"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap, Target, Wind, Shield, ArrowUp, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ItemIcon } from "./ItemIcon";
import { Spinner, TopProgress, Skeleton } from "./Loader";

const MAX_JUICE_SEASONINGS = 3;
const FLAVOURS_ALL: Flavour[] = ["SPICY", "DRY", "SWEET", "SOUR", "BITTER"];
const FLAVOUR_COLORS: Record<Flavour, string> = {
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  SWEET: "#f8b3d7",
  SOUR: "#f4d35e",
  BITTER: "#735a8a",
};
import type {
  Apricorn,
  Flavour,
  JuiceResult,
  RidingStat,
} from "@/lib/recommend/aprijuice";
import {
  APRICORN_EFFECTS,
  FLAVOUR_TO_STAT,
} from "@/lib/recommend/aprijuice";

type BerryDTO = {
  slug: string;
  itemId: string;
  colour: string | null;
  flavours: Partial<Record<Flavour, number>>;
};

const APRICORNS: Apricorn[] = [
  "RED",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PINK",
  "BLACK",
  "WHITE",
];

/** Cobblemon apricorn item ids, used to render the shaped recipe. */
const APRICORN_ITEM: Record<Apricorn, string> = {
  RED: "cobblemon:red_apricorn",
  YELLOW: "cobblemon:yellow_apricorn",
  GREEN: "cobblemon:green_apricorn",
  BLUE: "cobblemon:blue_apricorn",
  PINK: "cobblemon:pink_apricorn",
  BLACK: "cobblemon:black_apricorn",
  WHITE: "cobblemon:white_apricorn",
};

const APRICORN_HEX: Record<Apricorn, string> = {
  RED: "#ff6b6b",
  YELLOW: "#f7d26a",
  GREEN: "#6bcf7f",
  BLUE: "#6b9dff",
  PINK: "#f090c7",
  BLACK: "#2b2b33",
  WHITE: "#e9e9ee",
};

const STAT_ICON: Record<RidingStat, LucideIcon> = {
  ACCELERATION: Zap,
  SKILL: Target,
  SPEED: Wind,
  STAMINA: Shield,
  JUMP: ArrowUp,
};

const STAT_TONE: Record<RidingStat, string> = {
  ACCELERATION: "text-red-600 dark:text-red-400",
  SKILL: "text-cyan-600 dark:text-cyan-400",
  SPEED: "text-pink-600 dark:text-pink-400",
  STAMINA: "text-amber-600 dark:text-amber-400",
  JUMP: "text-purple-600 dark:text-purple-400",
};

type Suggestion = {
  apricorn: Apricorn;
  berrySlugs: string[];
  result: JuiceResult;
  score: number;
};

/**
 * Shaped Aprijuice recipe preview from the Cobblemon wiki — a 3×3 grid where
 * only the top row is used: apricorn (selected colour) + Pep-Up Flower +
 * Energy Root. The other 6 cells are intentionally empty, like the wiki's
 * cooking-interface.
 */
function JuiceRecipePreview({ apricornItem }: { apricornItem: string }) {
  const cells: Array<string | null> = [
    apricornItem,
    "cobblemon:pep_up_flower",
    "cobblemon:energy_root",
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  return (
    <div className="mt-3 grid grid-cols-3 gap-1 p-2 rounded-lg bg-subtle border border-border">
      {cells.map((id, i) => (
        <div
          key={i}
          className="size-10 rounded bg-card border border-border flex items-center justify-center"
          title={id ?? ""}
        >
          {id && <ItemIcon id={id} size={28} />}
        </div>
      ))}
    </div>
  );
}

export function JuiceMaker() {
  const t = useTranslations("juice");
  const tc = useTranslations("common");
  const [berries, setBerries] = useState<BerryDTO[]>([]);
  const [berriesLoading, setBerriesLoading] = useState(true);
  const [apricorn, setApricorn] = useState<Apricorn>("RED");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [result, setResult] = useState<JuiceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"cook" | "suggest">("cook");
  /**
   * Ordered priority list of ride stats the user cares about. A stat earlier
   * in the list weighs more than a later one (rank 1 = most important,
   * rank 5 = least important). Not listed = not wanted at all.
   */
  const [targetOrder, setTargetOrder] = useState<RidingStat[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/juice")
      .then((r) => r.json())
      .then((d: { berries?: BerryDTO[] }) => setBerries(d.berries ?? []))
      .catch(() => setBerries([]))
      .finally(() => setBerriesLoading(false));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/juice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apricorn, berrySlugs: slugs }),
          signal: ctrl.signal,
        });
        setResult((await res.json()) as JuiceResult);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResult(null);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [apricorn, slugs]);

  /**
   * Convert the ranked list into continuous weights the scorer understands.
   * Rank 1 → 5, rank 2 → 4, … rank 5 → 1. An unranked stat stays at 0.
   */
  const targetWeights = useMemo(() => {
    const w: Partial<Record<RidingStat, number>> = {};
    targetOrder.forEach((stat, i) => {
      w[stat] = targetOrder.length - i;
    });
    return w;
  }, [targetOrder]);

  // Reverse solver: whenever the ranking changes in suggest mode, fetch the
  // top combos from the server.
  useEffect(() => {
    if (mode !== "suggest") return;
    if (targetOrder.length === 0) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetch("/api/juice/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ weights: targetWeights, limit: 6 }),
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [mode, targetOrder, targetWeights]);

  const toggleTargetStat = (s: RidingStat) =>
    setTargetOrder((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const moveTargetStat = (s: RidingStat, delta: -1 | 1) =>
    setTargetOrder((prev) => {
      const i = prev.indexOf(s);
      if (i === -1) return prev;
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const applySuggestion = (s: Suggestion) => {
    setMode("cook");
    setApricorn(s.apricorn);
    setSlugs(s.berrySlugs.slice(0, MAX_JUICE_SEASONINGS));
  };

  const [query, setQuery] = useState("");
  const [activeFlavours, setActiveFlavours] = useState<Set<Flavour>>(new Set());
  const toggleFlavour = (f: Flavour) =>
    setActiveFlavours((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  type BerryEntry = BerryDTO & { dominant: Flavour | null };
  const berriesWithDominant: BerryEntry[] = useMemo(
    () =>
      berries
        .filter((b) => Object.values(b.flavours).some((v) => (v ?? 0) > 0))
        .map((b) => {
          const dom = (Object.entries(b.flavours) as Array<[Flavour, number]>)
            .sort((a, c) => (c[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? null;
          return { ...b, dominant: dom };
        }),
    [berries],
  );

  const visibleBerries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return berriesWithDominant.filter((b) => {
      if (q && !b.slug.replaceAll("_", " ").includes(q) && !b.itemId.includes(q))
        return false;
      if (activeFlavours.size > 0 && (!b.dominant || !activeFlavours.has(b.dominant)))
        return false;
      return true;
    });
  }, [berriesWithDominant, query, activeFlavours]);

  const addSlug = (slug: string) => {
    setSlugs((prev) => {
      if (prev.length >= MAX_JUICE_SEASONINGS) return prev;
      return [...prev, slug];
    });
  };
  const removeAt = (idx: number) =>
    setSlugs((prev) => prev.filter((_, i) => i !== idx));

  const flavourTotals = result?.flavourTotals ?? {
    SPICY: 0,
    DRY: 0,
    SWEET: 0,
    SOUR: 0,
    BITTER: 0,
  };
  const apricornDeltas = APRICORN_EFFECTS[apricorn];

  return (
    <div className="space-y-6">
      <TopProgress active={loading || berriesLoading || suggestLoading} />

      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setMode("cook")}
          aria-pressed={mode === "cook"}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            mode === "cook"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {t("modeCook")}
        </button>
        <button
          type="button"
          onClick={() => setMode("suggest")}
          aria-pressed={mode === "suggest"}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            mode === "suggest"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {t("modeSuggest")}
        </button>
      </div>

      {mode === "suggest" && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
              {t("targetTitle")}
            </h3>
            <p className="mt-1 text-xs text-muted">{t("targetHelp")}</p>

            {targetOrder.length > 0 && (
              <ol className="mt-3 space-y-1">
                {targetOrder.map((s, i) => {
                  const Icon = STAT_ICON[s];
                  return (
                    <li
                      key={s}
                      className="flex items-center gap-2 rounded-lg border border-accent bg-accent/5 px-2 py-1.5"
                    >
                      <span className="size-6 rounded-full bg-accent text-accent-foreground text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <Icon className={`h-4 w-4 ${STAT_TONE[s]} shrink-0`} />
                      <span className="text-xs uppercase tracking-wide flex-1">
                        {s.toLowerCase()}
                      </span>
                      <span className="text-[10px] font-mono text-muted tabular-nums">
                        ×{targetOrder.length - i}
                      </span>
                      <button
                        onClick={() => moveTargetStat(s, -1)}
                        disabled={i === 0}
                        aria-label={t("moveUp")}
                        className="size-6 rounded border border-border bg-card text-muted hover:text-foreground disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveTargetStat(s, 1)}
                        disabled={i === targetOrder.length - 1}
                        aria-label={t("moveDown")}
                        className="size-6 rounded border border-border bg-card text-muted hover:text-foreground disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggleTargetStat(s)}
                        aria-label={t("remove")}
                        className="size-6 rounded border border-border bg-card text-muted hover:text-red-500"
                      >
                        <X className="h-3 w-3 mx-auto" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {(["ACCELERATION", "SKILL", "SPEED", "STAMINA", "JUMP"] as RidingStat[])
                .filter((s) => !targetOrder.includes(s))
                .map((s) => {
                  const Icon = STAT_ICON[s];
                  return (
                    <button
                      key={s}
                      onClick={() => toggleTargetStat(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-muted hover:text-foreground text-xs transition-colors"
                    >
                      <Icon className={`h-3.5 w-3.5 ${STAT_TONE[s]}`} />
                      <span className="uppercase tracking-wide">
                        {s.toLowerCase()}
                      </span>
                    </button>
                  );
                })}
              {targetOrder.length > 0 && (
                <button
                  onClick={() => setTargetOrder([])}
                  className="text-xs px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
                >
                  {tc("clear")}
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
              {t("topCombos")} {suggestLoading && <Spinner className="ml-2" />}
            </h3>
            {targetOrder.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t("pickStat")}</p>
            ) : suggestions.length === 0 && !suggestLoading ? (
              <p className="mt-3 text-sm text-muted">{t("noCombo")}</p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.apricorn}-${s.berrySlugs.join(",")}`}
                    className={`rounded-xl border bg-card p-3 space-y-2 ${
                      i === 0 ? "border-accent ring-1 ring-accent/40" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-6 rounded-full border border-border shrink-0"
                        style={{ background: APRICORN_HEX[s.apricorn] }}
                        title={`${s.apricorn} apricorn`}
                      />
                      <span className="text-xs uppercase font-medium">
                        {t("apricornHeading", { kind: s.apricorn })}
                      </span>
                      {i < 3 && (
                        <span className="ml-auto text-[10px] font-mono bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">
                          #{i + 1}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 min-h-[2.5rem]">
                      {s.berrySlugs.length === 0 ? (
                        <span className="text-[10px] text-muted italic">
                          {t("noSeasoning")}
                        </span>
                      ) : (
                        s.berrySlugs.map((slug, j) => {
                          const b = berries.find((x) => x.slug === slug);
                          return (
                            <span
                              key={`${slug}-${j}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-subtle px-1.5 py-1"
                              title={slug}
                            >
                              {b && <ItemIcon id={b.itemId} size={20} />}
                              <span className="text-[10px] capitalize">
                                {slug.replaceAll("_", " ")}
                              </span>
                            </span>
                          );
                        })
                      )}
                    </div>

                    <ul className="grid grid-cols-5 gap-1 text-[10px]">
                      {(["ACCELERATION", "SKILL", "SPEED", "STAMINA", "JUMP"] as RidingStat[]).map(
                        (stat) => {
                          const delta = s.result.statBoosts[stat] ?? 0;
                          const Icon = STAT_ICON[stat];
                          return (
                            <div
                              key={stat}
                              className={`rounded-md border p-1 flex flex-col items-center gap-0.5 ${
                                delta > 0
                                  ? "border-emerald-500/40 bg-emerald-500/5"
                                  : delta < 0
                                    ? "border-red-500/40 bg-red-500/5"
                                    : "border-border"
                              }`}
                            >
                              <Icon className={`h-3 w-3 ${STAT_TONE[stat]}`} />
                              <span className="font-mono">
                                {delta > 0 ? "+" : ""}
                                {delta}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </ul>

                    <button
                      onClick={() => applySuggestion(s)}
                      className="w-full text-xs px-2 py-1.5 rounded-md border border-border hover:border-accent/60 hover:bg-subtle transition-colors"
                    >
                      {t("loadIntoCook")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {mode === "cook" && (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <aside className="space-y-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("apricorn")}
          </h3>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {APRICORNS.map((a) => {
              const active = a === apricorn;
              return (
                <button
                  key={a}
                  onClick={() => setApricorn(a)}
                  aria-label={`${a} apricorn`}
                  className={`relative aspect-square rounded-full border-2 transition-transform ${
                    active
                      ? "border-accent scale-110 ring-2 ring-ring/30"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ background: APRICORN_HEX[a] }}
                  title={a}
                />
              );
            })}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-wide text-muted">
            {t("apricornHeading", { kind: apricorn })}
          </div>

          <JuiceRecipePreview apricornItem={APRICORN_ITEM[apricorn]} />
          <div className="text-[10px] text-muted uppercase text-center">
            {t("title")}
          </div>
          <ul className="mt-2 text-xs space-y-0.5">
            {(Object.entries(apricornDeltas) as Array<[RidingStat, number]>).map(
              ([stat, delta]) => (
                <li key={stat} className="flex items-center gap-2">
                  {(() => {
                    const Icon = STAT_ICON[stat];
                    return <Icon className={`${STAT_TONE[stat]} h-4 w-4`} />;
                  })()}
                  <span className="text-muted flex-1">{stat.toLowerCase()}</span>
                  <span
                    className={`font-mono ${
                      delta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : delta < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                </li>
              ),
            )}
            {Object.keys(apricornDeltas).length === 0 && (
              <li className="text-muted italic">{t("noBakedEffect")}</li>
            )}
          </ul>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-muted border-t border-border pt-3">
          {t("flavourThresholds")}
        </div>
        <ul className="text-[10px] text-muted grid grid-cols-2 gap-x-2">
          <li>15 → 1pt</li>
          <li>35 → 2pt</li>
          <li>45 → 3pt</li>
          <li>55 → 4pt</li>
          <li>75 → 5pt</li>
          <li>105 → 6pt</li>
        </ul>
      </aside>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("seasoningSlots")}
            <span className="ml-2 text-[10px] normal-case tracking-normal text-muted">
              {t("slotsCap", { count: slugs.length, max: MAX_JUICE_SEASONINGS })}
            </span>
          </h3>

          <div className="mt-3 inline-flex gap-3 p-3 rounded-xl border border-border bg-card">
            {Array.from({ length: MAX_JUICE_SEASONINGS }).map((_, idx) => {
              const slug = slugs[idx];
              const b = slug ? berries.find((x) => x.slug === slug) : null;
              return (
                <button
                  key={idx}
                  onClick={() => slug && removeAt(idx)}
                  className={`relative size-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    slug
                      ? "border-accent bg-subtle hover:border-red-400 group"
                      : "border-dashed border-border text-muted"
                  }`}
                  title={slug ? `Remove ${slug}` : "Empty slot"}
                >
                  {b ? (
                    <>
                      <ItemIcon id={b.itemId} size={40} />
                      <span className="absolute inset-0 rounded-md bg-red-500/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <X className="h-6 w-6 text-white" />
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] uppercase">slot {idx + 1}</span>
                  )}
                </button>
              );
            })}
            {slugs.length > 0 && (
              <button
                onClick={() => setSlugs([])}
                className="self-center text-xs px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("pantryBerries")}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("filterBerries")}
              className="w-full sm:w-52 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <div className="flex flex-wrap gap-1">
              {FLAVOURS_ALL.map((f) => {
                const active = activeFlavours.has(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleFlavour(f)}
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full border transition-colors ${
                      active
                        ? "border-transparent text-foreground"
                        : "border-border bg-card text-muted hover:text-foreground"
                    }`}
                    style={
                      active
                        ? {
                            background: `${FLAVOUR_COLORS[f]}33`,
                            borderColor: FLAVOUR_COLORS[f],
                          }
                        : undefined
                    }
                    title={`${f} → ${FLAVOUR_TO_STAT[f]}`}
                  >
                    {f}
                  </button>
                );
              })}
              {activeFlavours.size > 0 && (
                <button
                  onClick={() => setActiveFlavours(new Set())}
                  className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 max-h-[320px] overflow-y-auto p-2 rounded-lg border border-border bg-subtle">
            {berriesLoading && berries.length === 0 ? (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <li key={`sk-bp-${i}`}>
                    <Skeleton className="h-[86px] w-full" />
                  </li>
                ))}
              </ul>
            ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
              {visibleBerries.map((b) => {
                const full = slugs.length >= MAX_JUICE_SEASONINGS;
                return (
                  <li key={b.slug}>
                    <button
                      onClick={() => addSlug(b.slug)}
                      disabled={full}
                      className={`w-full rounded-lg border bg-card p-2 flex flex-col items-center gap-1 transition-colors ${
                        full
                          ? "opacity-40 cursor-not-allowed border-border"
                          : "border-border hover:border-accent/60 hover:bg-subtle"
                      }`}
                      title={Object.entries(b.flavours)
                        .filter(([, v]) => (v ?? 0) > 0)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ")}
                    >
                      <ItemIcon id={b.itemId} size={32} />
                      <span className="text-[10px] capitalize text-center leading-tight truncate w-full">
                        {b.slug.replaceAll("_", " ")}
                      </span>
                      {b.dominant && (
                        <span
                          className="text-[9px] uppercase font-mono rounded-full px-1.5 py-[1px]"
                          style={{
                            background: `${FLAVOUR_COLORS[b.dominant]}33`,
                            color: FLAVOUR_COLORS[b.dominant],
                          }}
                        >
                          {b.dominant.slice(0, 3)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {visibleBerries.length === 0 && (
                <li className="col-span-full text-center text-xs text-muted py-6">
                  {t("noBerry")}
                </li>
              )}
            </ul>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("flavourTotals")} {loading && <Spinner className="ml-2" />}
          </h3>
          <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
            {(
              ["SPICY", "DRY", "SWEET", "SOUR", "BITTER"] as Flavour[]
            ).map((f) => {
              const pts = result?.pointsFromFlavours[FLAVOUR_TO_STAT[f]] ?? 0;
              const total = flavourTotals[f];
              const pct = Math.min(100, (total / 105) * 100);
              return (
                <div
                  key={f}
                  className="rounded-lg border border-border bg-card p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-medium">
                      {f}
                    </span>
                    <span className="text-[10px] text-muted">
                      → {FLAVOUR_TO_STAT[f].slice(0, 3)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-subtle overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="font-mono">{total}</span>
                    <span className="font-mono text-accent">+{pts}pt</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("rideBoosts")}
          </h3>
          <p className="mt-1 text-xs text-muted">{t("rideBoostsHelp")}</p>
          {result && result.summary.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {t("noNetBoost")}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {(
                ["ACCELERATION", "SKILL", "SPEED", "STAMINA", "JUMP"] as RidingStat[]
              ).map((stat) => {
                const entry = result?.summary.find((s) => s.stat === stat);
                const delta = entry?.delta ?? 0;
                const fromBerries = entry?.fromBerries ?? 0;
                const fromApricorn = entry?.fromApricorn ?? 0;
                return (
                  <div
                    key={stat}
                    className={`rounded-lg border p-3 ${
                      delta > 0
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : delta < 0
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = STAT_ICON[stat];
                        return <Icon className={`${STAT_TONE[stat]} h-5 w-5`} />;
                      })()}
                      <span className="text-[10px] uppercase font-medium tracking-wide">
                        {stat.toLowerCase()}
                      </span>
                      <span
                        className={`ml-auto font-mono text-lg ${
                          delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : delta < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    </div>
                    {(fromBerries !== 0 || fromApricorn !== 0) && (
                      <div className="mt-1 text-[10px] text-muted font-mono">
                        berries {fromBerries > 0 ? "+" : ""}
                        {fromBerries} · apricorn {fromApricorn > 0 ? "+" : ""}
                        {fromApricorn}
                      </div>
                    )}
                  </div>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
      )}
    </div>
  );
}
