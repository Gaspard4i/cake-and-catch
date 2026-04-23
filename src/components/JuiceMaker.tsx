"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemIcon } from "./ItemIcon";
import { MultiSelect } from "./MultiSelect";
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

const APRICORN_HEX: Record<Apricorn, string> = {
  RED: "#ff6b6b",
  YELLOW: "#f7d26a",
  GREEN: "#6bcf7f",
  BLUE: "#6b9dff",
  PINK: "#f090c7",
  BLACK: "#2b2b33",
  WHITE: "#e9e9ee",
};

const STAT_ICON: Record<RidingStat, string> = {
  ACCELERATION: "⚡",
  SKILL: "🎯",
  SPEED: "💨",
  STAMINA: "🛡",
  JUMP: "⬆",
};

const STAT_TONE: Record<RidingStat, string> = {
  ACCELERATION: "text-red-600 dark:text-red-400",
  SKILL: "text-cyan-600 dark:text-cyan-400",
  SPEED: "text-pink-600 dark:text-pink-400",
  STAMINA: "text-amber-600 dark:text-amber-400",
  JUMP: "text-purple-600 dark:text-purple-400",
};

export function JuiceMaker() {
  const [berries, setBerries] = useState<BerryDTO[]>([]);
  const [apricorn, setApricorn] = useState<Apricorn>("RED");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [result, setResult] = useState<JuiceResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/juice")
      .then((r) => r.json())
      .then((d: { berries?: BerryDTO[] }) => setBerries(d.berries ?? []))
      .catch(() => setBerries([]));
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

  const berryOptions = useMemo(
    () =>
      berries
        .filter((b) => Object.values(b.flavours).some((v) => (v ?? 0) > 0))
        .map((b) => {
          const dom = (Object.entries(b.flavours) as Array<[Flavour, number]>)
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
          return {
            value: b.slug,
            label: b.slug.replaceAll("_", " "),
            group: dom ? `${dom} (${FLAVOUR_TO_STAT[dom]})` : "Other",
            description: Object.entries(b.flavours)
              .filter(([, v]) => (v ?? 0) > 0)
              .map(([k, v]) => `${k.slice(0, 3)} ${v}`)
              .join(" · "),
          };
        }),
    [berries],
  );

  const flavourTotals = result?.flavourTotals ?? {
    SPICY: 0,
    DRY: 0,
    SWEET: 0,
    SOUR: 0,
    BITTER: 0,
  };
  const apricornDeltas = APRICORN_EFFECTS[apricorn];

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <aside className="space-y-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            Apricorn
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
            {apricorn} aprijuice
          </div>
          <ul className="mt-2 text-xs space-y-0.5">
            {(Object.entries(apricornDeltas) as Array<[RidingStat, number]>).map(
              ([stat, delta]) => (
                <li key={stat} className="flex items-center gap-2">
                  <span className={`${STAT_TONE[stat]} font-mono w-6`}>
                    {STAT_ICON[stat]}
                  </span>
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
              <li className="text-muted italic">no baked-in effect</li>
            )}
          </ul>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-muted border-t border-border pt-3">
          Flavour thresholds
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
            Berries
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MultiSelect
              label="Add"
              options={berryOptions}
              value={slugs}
              onChange={setSlugs}
              placeholder="Pick berries"
            />
            {slugs.length > 0 && (
              <button
                onClick={() => setSlugs([])}
                className="text-xs px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 min-h-[3rem]">
            {slugs.map((s) => {
              const b = berries.find((x) => x.slug === s);
              if (!b) return null;
              return (
                <button
                  key={s}
                  onClick={() => setSlugs((prev) => prev.filter((x) => x !== s))}
                  className="rounded-lg border border-border bg-card px-2 py-1 flex items-center gap-2 hover:border-accent/50"
                  title={`remove ${s}`}
                >
                  <ItemIcon id={b.itemId} size={24} />
                  <span className="text-xs capitalize">
                    {s.replaceAll("_", " ")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            Flavour totals {loading && "…"}
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
            Ride stat boosts
          </h3>
          <p className="mt-1 text-xs text-muted">
            Result = flavour points (converted from totals) + apricorn baseline.
            Held by a rideable Pokémon, these boost its ride controller stats.
          </p>
          {result && result.summary.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No net boost. Add more berries to cross the next threshold.
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
                      <span className={`${STAT_TONE[stat]} text-lg`}>
                        {STAT_ICON[stat]}
                      </span>
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
  );
}
