"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ItemIcon } from "./ItemIcon";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";
import { Cake3D, type BerryPlacement } from "./Cake3D";

type Seasoning = {
  slug: string;
  itemId: string;
  kind: "berry" | "other";
  cakeValid: boolean;
  category: string;
  colour: string | null;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
  description: string | null;
  effects: Array<Record<string, unknown>>;
};

type AttractedEntry = {
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
  matchedFlavour: string;
  bestBucket: string;
  bestWeight: number;
  spawnCount: number;
};

const BIOME_PRESETS = [
  { value: "#cobblemon:is_plains", label: "Plains" },
  { value: "#cobblemon:is_forest", label: "Forest" },
  { value: "#cobblemon:is_jungle", label: "Jungle" },
  { value: "#cobblemon:is_savanna", label: "Savanna" },
  { value: "#cobblemon:is_ocean", label: "Ocean" },
  { value: "#cobblemon:is_desert", label: "Desert" },
  { value: "#cobblemon:is_mountain", label: "Mountain" },
  { value: "#cobblemon:is_snowy", label: "Snowy" },
  { value: "#cobblemon:is_swamp", label: "Swamp" },
  { value: "#cobblemon:is_tropical_island", label: "Tropical island" },
  { value: "#cobblemon:is_river", label: "River" },
  { value: "#cobblemon:is_cave", label: "Cave" },
  { value: "#cobblemon:is_nether", label: "Nether" },
  { value: "#cobblemon:is_end", label: "End" },
];

const TIMES = [
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "morning", label: "Morning" },
  { value: "noon", label: "Noon" },
  { value: "dusk", label: "Dusk" },
];

const FLAVOURS = ["SWEET", "SPICY", "DRY", "BITTER", "SOUR"] as const;
const KINDS = ["all", "berry", "other"] as const;

const FLAVOUR_COLORS: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

type SlotState = [Seasoning | null, Seasoning | null, Seasoning | null];

export function CampfirePot() {
  const [seasonings, setSeasonings] = useState<Seasoning[]>([]);
  const [slots, setSlots] = useState<SlotState>([null, null, null]);
  const [biomes, setBiomes] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [minY, setMinY] = useState<string>("");
  const [maxY, setMaxY] = useState<string>("");
  const [attracted, setAttracted] = useState<AttractedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFlavours, setActiveFlavours] = useState<Set<string>>(new Set());
  const [kindFilter, setKindFilter] = useState<(typeof KINDS)[number]>("all");

  useEffect(() => {
    fetch("/api/cake")
      .then((r) => r.json())
      .then((d: { seasonings: Seasoning[] }) => setSeasonings(d.seasonings));
  }, []);

  const filtered = useMemo(() => {
    let list = seasonings;
    if (kindFilter !== "all") list = list.filter((s) => s.kind === kindFilter);
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      list = list.filter((s) => s.slug.includes(q));
    }
    if (activeFlavours.size > 0) {
      list = list.filter(
        (s) => s.dominantFlavour && activeFlavours.has(s.dominantFlavour),
      );
    }
    return list;
  }, [seasonings, kindFilter, filterQuery, activeFlavours]);

  const grouped = useMemo(() => {
    const map = new Map<string, Seasoning[]>();
    for (const s of filtered) {
      const key = s.kind === "berry" ? "Berries" : s.category;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  const dominant = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const slot of slots) {
      if (!slot) continue;
      for (const [k, v] of Object.entries(slot.flavours ?? {}))
        agg[k] = (agg[k] ?? 0) + v;
    }
    let best: string | null = null;
    let bestVal = 0;
    for (const f of FLAVOURS) {
      const v = agg[f] ?? 0;
      if (v > bestVal) {
        bestVal = v;
        best = f;
      }
    }
    return best;
  }, [slots]);

  const cakeBerries = useMemo<BerryPlacement[]>(() => {
    return slots
      .filter((s): s is Seasoning => s !== null)
      .map((s) => ({
        slug: s.slug,
        itemId: s.itemId,
        colour: s.colour,
        flavours: s.flavours,
        dominantFlavour: s.dominantFlavour,
      }));
  }, [slots]);

  // Debounced AJAX query
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const seasoningSlugs = slots
          .filter((s): s is Seasoning => s !== null)
          .map((s) => s.slug);
        const body = {
          composition: { seasoningSlugs },
          filter: {
            biomes: biomes.length > 0 ? biomes : undefined,
            timeRanges: times.length > 0 ? times : undefined,
            minY: minY ? Number.parseInt(minY, 10) : undefined,
            maxY: maxY ? Number.parseInt(maxY, 10) : undefined,
          },
        };
        const res = await fetch("/api/cake", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { attracted: AttractedEntry[] };
        setAttracted(data.attracted ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setAttracted([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [slots, biomes, times, minY, maxY]);

  const setSlot = (idx: number, s: Seasoning | null) => {
    const next = [...slots] as SlotState;
    next[idx] = s;
    setSlots(next);
  };

  const findEmptySlot = () => slots.findIndex((s) => s === null);

  const toggleBiome = (b: string) =>
    setBiomes((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const toggleTime = (t: string) =>
    setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleFlavour = (f: string) =>
    setActiveFlavours((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <aside className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Pot</h3>
          <div className="mt-3 inline-flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card">
            {/* 3 seasoning slots */}
            <div className="flex gap-2">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const slug = e.dataTransfer.getData("text/seasoning");
                    const s = seasonings.find((x) => x.slug === slug);
                    if (s && s.cakeValid) setSlot(idx, s);
                  }}
                  onClick={() => setSlot(idx, null)}
                  title={slot ? `Remove ${slot.slug}` : "Drop a seasoning here"}
                  className={`size-20 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    slot
                      ? "border-accent bg-subtle"
                      : "border-dashed border-border bg-subtle/50 hover:bg-subtle"
                  }`}
                  style={
                    slot?.colour
                      ? { boxShadow: `0 0 0 2px ${slot.colour.toLowerCase()}33 inset` }
                      : undefined
                  }
                >
                  {slot ? (
                    <ItemIcon id={slot.itemId} size={56} />
                  ) : (
                    <span className="text-[9px] text-muted uppercase">S{idx + 1}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted uppercase">3 seasoning slots</div>

            {/* 3D Cake, bound to slots */}
            <Cake3D flavour={dominant} berries={cakeBerries} size={200} />

            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Dominant:</span>
              {dominant ? (
                <span
                  className="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase text-foreground"
                  style={{ background: `${FLAVOUR_COLORS[dominant]}33` }}
                >
                  {dominant}
                </span>
              ) : (
                <span className="font-mono">—</span>
              )}
            </div>

            {/* Base cake ingredients */}
            <div className="mt-2 grid grid-cols-3 gap-1 p-2 rounded-lg bg-subtle">
              {[
                "c:drinks/milk",
                "c:drinks/milk",
                "c:drinks/milk",
                "minecraft:sugar",
                "cobblemon:vivichoke",
                "minecraft:sugar",
                "cobblemon:hearty_grains",
                "cobblemon:hearty_grains",
                "cobblemon:hearty_grains",
              ].map((id, i) => (
                <div
                  key={i}
                  className="size-10 rounded bg-card border border-border flex items-center justify-center"
                  title={id}
                >
                  <ItemIcon id={id} size={28} />
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted uppercase">Poké Cake base</div>
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            Pantry — seasonings
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter seasonings…"
              className="w-full sm:w-52 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-1">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className={`text-[10px] uppercase px-2 py-0.5 rounded-full border transition-colors ${
                    kindFilter === k
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {FLAVOURS.map((f) => {
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
                        ? { background: `${FLAVOUR_COLORS[f]}33`, borderColor: FLAVOUR_COLORS[f] }
                        : undefined
                    }
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

          <div className="mt-3 max-h-[420px] overflow-y-auto p-2 rounded-lg border border-border bg-subtle space-y-3">
            {grouped.length === 0 && (
              <p className="text-xs text-muted p-3">No seasoning matches these filters.</p>
            )}
            {grouped.map(([category, items]) => (
              <div key={category}>
                <div className="text-[10px] uppercase tracking-wider text-muted px-1 mb-1">
                  {category} ({items.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <SeasoningChip
                      key={s.slug}
                      seasoning={s}
                      onPick={() => {
                        if (!s.cakeValid) return;
                        const idx = findEmptySlot();
                        if (idx >= 0) setSlot(idx, s);
                      }}
                      selected={slots.some((slot) => slot?.slug === s.slug)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Filters</h3>
          <div className="mt-2 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
                Biomes (any)
              </div>
              <div className="flex flex-wrap gap-1">
                {BIOME_PRESETS.map((p) => {
                  const active = biomes.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => toggleBiome(p.value)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-card border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                {biomes.length > 0 && (
                  <button
                    onClick={() => setBiomes([])}
                    className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
                  >
                    clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
                Time (any)
              </div>
              <div className="flex flex-wrap gap-1">
                {TIMES.map((t) => {
                  const active = times.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      onClick={() => toggleTime(t.value)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-card border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
                {times.length > 0 && (
                  <button
                    onClick={() => setTimes([])}
                    className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
                  >
                    clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <label className="text-xs">
                <span className="block text-muted mb-1">Min Y</span>
                <input
                  value={minY}
                  onChange={(e) => setMinY(e.target.value)}
                  inputMode="numeric"
                  placeholder="-64"
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="block text-muted mb-1">Max Y</span>
                <input
                  value={maxY}
                  onChange={(e) => setMaxY(e.target.value)}
                  inputMode="numeric"
                  placeholder="320"
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            Attracted Pokémon {loading && "…"}
          </h3>
          <p className="mt-1 text-xs text-muted">
            Pokémon who can spawn in the chosen conditions AND whose preferred flavour matches
            the cake.
          </p>
          {attracted.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No Pokémon match. Try removing filters.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {attracted.slice(0, 24).map((p) => (
                <li
                  key={p.slug}
                  className="rounded-lg border border-border bg-card p-2 flex items-center gap-2"
                >
                  <PokemonSprite
                    dexNo={p.dexNo}
                    name={p.name}
                    size={44}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-muted">
                      #{String(p.dexNo).padStart(4, "0")}
                    </div>
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="mt-0.5">
                      <TypePair primary={p.primaryType} secondary={p.secondaryType} size={18} />
                    </div>
                    <div className="text-[10px] text-muted uppercase mt-0.5">
                      {p.bestBucket} · w {p.bestWeight}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {attracted.length > 24 && (
            <p className="mt-3 text-xs text-muted">+ {attracted.length - 24} more…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SeasoningChip({
  seasoning,
  onPick,
  selected,
}: {
  seasoning: Seasoning;
  onPick: () => void;
  selected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [placement, setPlacement] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const flavourLabel = seasoning.dominantFlavour ?? seasoning.category;

  useLayoutEffect(() => {
    if (!hovered || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tooltipW = 260;
    const tooltipH = 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Flip above when too close to bottom
    const flipAbove = rect.bottom + tooltipH + 8 > vh;
    // Clamp horizontally
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    if (left < 8) left = 8;
    if (left + tooltipW > vw - 8) left = vw - 8 - tooltipW;

    if (flipAbove) {
      setPlacement({ top: rect.top - tooltipH - 8, left });
    } else {
      setPlacement({ top: rect.bottom + 4, left });
    }
  }, [hovered]);

  return (
    <>
      <button
        ref={anchorRef}
        draggable={seasoning.cakeValid}
        onDragStart={(e) => {
          if (!seasoning.cakeValid) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("text/seasoning", seasoning.slug);
        }}
        onClick={onPick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        title={`${seasoning.slug} · ${flavourLabel}${seasoning.cakeValid ? "" : " (not a cake seasoning)"}`}
        className={`size-12 rounded border transition-colors flex items-center justify-center relative ${
          selected
            ? "border-accent ring-2 ring-ring/30 bg-subtle"
            : seasoning.cakeValid
              ? "border-border bg-card hover:border-accent cursor-pointer"
              : "border-border bg-card opacity-50 cursor-help"
        }`}
      >
        <ItemIcon id={seasoning.itemId} size={40} />
        {!seasoning.cakeValid && (
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-muted/60 border border-border" />
        )}
      </button>
      {hovered && (
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            ...placement,
            width: 260,
            zIndex: 60,
          }}
          className="p-3 rounded-lg border border-border bg-card shadow-lg pointer-events-none"
        >
          <div className="flex items-center gap-2">
            <ItemIcon id={seasoning.itemId} size={24} />
            <div className="font-medium capitalize min-w-0 truncate">
              {seasoning.slug.replaceAll("_", " ")}
            </div>
            <span
              className="ml-auto shrink-0 text-[10px] uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: `${FLAVOUR_COLORS[flavourLabel] ?? "#888"}33`,
              }}
            >
              {flavourLabel}
            </span>
          </div>
          {seasoning.kind === "berry" && (
            <div className="mt-1 text-[10px] text-muted font-mono">
              {Object.entries(seasoning.flavours)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `${k.slice(0, 3)} ${v}`)
                .join(" · ")}
            </div>
          )}
          {!seasoning.cakeValid && (
            <div className="mt-1 text-[10px] uppercase text-amber-700 dark:text-amber-300">
              ✗ not a Poké Cake seasoning
            </div>
          )}
          {seasoning.description && (
            <p className="mt-2 text-xs text-muted leading-snug">{seasoning.description}</p>
          )}
        </div>
      )}
    </>
  );
}
