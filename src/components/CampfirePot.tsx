"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Spinner, TopProgress, AttractedCardSkeleton, Skeleton } from "./Loader";
import { ItemIcon } from "./ItemIcon";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";
import { Snack3D, type BerryPlacement } from "./Snack3D";
import { MultiSelect, type MultiSelectOption } from "./MultiSelect";
import { SnackEffectsSummary } from "./SnackEffectsSummary";
import type { FormattedBaitEffect } from "@/lib/recommend/bait-effects";

type BaitEffect = FormattedBaitEffect;

type Seasoning = {
  slug: string;
  itemId: string;
  kind: "berry" | "other";
  snackValid: boolean;
  category: string;
  colour: string | null;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
  description: string | null;
  effectTags: string[];
  baitEffects: BaitEffect[];
  fruitModel?: string | null;
  fruitTexture?: string | null;
  snackPositionings?: Array<{
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
};

const EFFECT_TONE_STYLES: Record<BaitEffect["tone"], string> = {
  healing: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  friendship: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  defense: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  buff: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  offense: "bg-red-500/15 text-red-700 dark:text-red-300",
  utility: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

/**
 * Cobblemon pot colour variants. In-game the pot tint is cosmetic, but the
 * cooked item inherits the pale FoodColourComponent palette, so we reuse
 * those pastel hex values here for a plausible-looking cake override.
 */
const POT_COLOURS = [
  { slug: null, label: "Default", hex: "#c9b89e" },
  { slug: "white", label: "White", hex: "#ffffff" },
  { slug: "black", label: "Black", hex: "#555555" },
  { slug: "red", label: "Red", hex: "#ffafd7" },
  { slug: "blue", label: "Blue", hex: "#78a5ff" },
  { slug: "green", label: "Green", hex: "#afffb4" },
  { slug: "pink", label: "Pink", hex: "#e1a0ff" },
  { slug: "yellow", label: "Yellow", hex: "#ffe1af" },
] as const;

type AttractedEntry = {
  slug: string;
  name: string;
  dexNo: number;
  primaryType: string;
  secondaryType: string | null;
  bucket: "common" | "uncommon" | "rare" | "ultra-rare";
  weight: number;
  adjustedWeight: number;
  probability: number;
  reasons: string[];
  levelMin: number;
  levelMax: number;
};

/** Pretty group label shown in the multi-select dropdown per namespace. */
const NS_LABEL: Record<string, string> = {
  cobblemon: "Cobblemon tags",
  minecraft: "Minecraft vanilla",
  terralith: "Terralith",
  biomesoplenty: "Biomes O' Plenty",
  byg: "Oh The Biomes You'll Go",
  aether: "The Aether",
  incendium: "Incendium",
  nullscape: "Nullscape",
  the_bumblezone: "The Bumblezone",
};

const TIME_OPTIONS: MultiSelectOption[] = [
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "morning", label: "Morning" },
  { value: "noon", label: "Noon" },
  { value: "dusk", label: "Dusk" },
];

const TYPE_OPTIONS: MultiSelectOption[] = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting",
  "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
  "dragon", "dark", "steel", "fairy",
].map((t) => ({ value: t, label: t }));

const BUCKET_OPTIONS: MultiSelectOption[] = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "ultra-rare", label: "Ultra-rare" },
];

const NAMESPACE_OPTIONS: MultiSelectOption[] = [
  { value: "cobblemon", label: "Cobblemon (tags)", group: "Default" },
  { value: "minecraft", label: "Minecraft vanilla", group: "Default" },
  { value: "terralith", label: "Terralith", group: "Mods" },
  { value: "biomesoplenty", label: "Biomes O' Plenty", group: "Mods" },
  { value: "byg", label: "Oh The Biomes You'll Go", group: "Mods" },
  { value: "aether", label: "The Aether", group: "Mods" },
  { value: "incendium", label: "Incendium", group: "Mods" },
  { value: "nullscape", label: "Nullscape", group: "Mods" },
  { value: "the_bumblezone", label: "The Bumblezone", group: "Mods" },
];

const FLAVOURS = ["SWEET", "SPICY", "DRY", "BITTER", "SOUR"] as const;
const KINDS = ["all", "berry", "vanilla"] as const;

const FLAVOUR_COLORS: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

type SlotState = [Seasoning | null, Seasoning | null, Seasoning | null];

type BiomeApiEntry = { value: string; label: string; namespace: string };

/**
 * Poké Snack base recipe preview (3x3 grid of required non-seasoning
 * ingredients). Extracted so the snack page can mount it in the top-right
 * of the hero header, next to the title, rather than inside the cooking pot
 * column. Alternates between Cobblemon moomoo milk and vanilla milk buckets
 * on an interval to make the preview a little more lively.
 */
export function SnackBaseRecipe({ size = 48 }: { size?: number }) {
  const t = useTranslations("snack");
  const [useVanillaMilk, setUseVanillaMilk] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setUseVanillaMilk((v) => !v), 2500);
    return () => window.clearInterval(id);
  }, []);
  const milkId = useVanillaMilk ? "minecraft:milk_bucket" : "cobblemon:moomoo_milk";
  const ids = [
    milkId,
    milkId,
    milkId,
    "minecraft:honey_bottle",
    "cobblemon:vivichoke",
    "minecraft:honey_bottle",
    "cobblemon:hearty_grains",
    "cobblemon:hearty_grains",
    "cobblemon:hearty_grains",
  ];
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="grid grid-cols-3 gap-1 p-2 rounded-lg bg-subtle border border-border">
        {ids.map((id, i) => (
          <div
            key={i}
            className="rounded bg-card border border-border flex items-center justify-center"
            style={{ width: size, height: size }}
            title={id}
          >
            <ItemIcon id={id} size={Math.round(size * 0.7)} />
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted uppercase">{t("baseRecipe")}</div>
    </div>
  );
}

export function CampfirePot() {
  const t = useTranslations("snack");
  const tc = useTranslations("common");
  const [seasonings, setSeasonings] = useState<Seasoning[]>([]);
  const [slots, setSlots] = useState<SlotState>([null, null, null]);
  const [biomes, setBiomes] = useState<string[]>([]);
  const [biomeCatalog, setBiomeCatalog] = useState<BiomeApiEntry[]>([]);
  const [allowedNamespaces, setAllowedNamespaces] = useState<string[]>([
    "cobblemon",
    "minecraft",
  ]);
  const [times, setTimes] = useState<string[]>([]);
  const [minY, setMinY] = useState<string>("");
  const [maxY, setMaxY] = useState<string>("");
  const [attracted, setAttracted] = useState<AttractedEntry[]>([]);
  const [attractedVisible, setAttractedVisible] = useState(24);
  const attractedSentinelRef = useRef<HTMLDivElement>(null);
  const [attQuery, setAttQuery] = useState("");
  const [attTypes, setAttTypes] = useState<string[]>([]);
  const [attBuckets, setAttBuckets] = useState<string[]>([]);
  const [attSort, setAttSort] = useState<
    "probability" | "dex" | "dex_desc" | "name" | "name_desc" | "bucket"
  >("probability");
  const [showShiny, setShowShiny] = useState(false);
  const [snackBaitEffects, setSnackBaitEffects] = useState<BaitEffect[]>([]);
  const [potColour, setPotColour] = useState<typeof POT_COLOURS[number]>(POT_COLOURS[0]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFlavours, setActiveFlavours] = useState<Set<string>>(new Set());
  const [kindFilter, setKindFilter] = useState<(typeof KINDS)[number]>("all");
  const [validOnly, setValidOnly] = useState(true);
  const [pantryLoading, setPantryLoading] = useState(true);
  /** Adaptive 3D snack size: ~180px on phones, 220px on desktop. */
  const [snack3DSize, setSnack3DSize] = useState(220);
  useEffect(() => {
    const update = () => setSnack3DSize(window.innerWidth < 640 ? 180 : 220);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setPantryLoading(true);
    fetch("/api/snack")
      .then((r) => r.json())
      .then((d: { seasonings: Seasoning[] }) => setSeasonings(d.seasonings ?? []))
      .catch(() => setSeasonings([]))
      .finally(() => setPantryLoading(false));
    fetch("/api/biomes")
      .then((r) => r.json())
      .then((d: { biomes: BiomeApiEntry[] }) => setBiomeCatalog(d.biomes ?? []))
      .catch(() => setBiomeCatalog([]));
  }, []);

  const biomeOptions = useMemo<MultiSelectOption[]>(() => {
    const set = new Set(allowedNamespaces);
    return biomeCatalog
      .filter((b) => set.has(b.namespace))
      .map((b) => ({
        value: b.value,
        label: b.label,
        group: NS_LABEL[b.namespace] ?? b.namespace,
      }));
  }, [biomeCatalog, allowedNamespaces]);

  // Prune selected biomes that are no longer in the allowed namespace set.
  useEffect(() => {
    setBiomes((prev) =>
      prev.filter((v) =>
        allowedNamespaces.includes(
          biomeCatalog.find((b) => b.value === v)?.namespace ?? "",
        ),
      ),
    );
  }, [allowedNamespaces, biomeCatalog]);

  const filtered = useMemo(() => {
    let list = seasonings;
    if (validOnly) list = list.filter((s) => s.snackValid);
    if (kindFilter !== "all") {
      list = list.filter((s) =>
        kindFilter === "berry" ? s.kind === "berry" : s.kind === "other",
      );
    }
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
  }, [seasonings, validOnly, kindFilter, filterQuery, activeFlavours]);

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

  const snackBerries = useMemo<BerryPlacement[]>(() => {
    return slots
      .filter((s): s is Seasoning => s !== null)
      .map((s) => ({
        slug: s.slug,
        itemId: s.itemId,
        colour: s.colour,
        flavours: s.flavours,
        dominantFlavour: s.dominantFlavour,
        fruitModel: s.fruitModel ?? null,
        fruitTexture: s.fruitTexture ?? null,
        snackPositionings: s.snackPositionings ?? [],
      }));
  }, [slots]);

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
        const res = await fetch("/api/snack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        const data = (await res.json()) as {
          attracted: AttractedEntry[];
          snack?: { baitEffects?: BaitEffect[] };
        };
        setAttracted(data.attracted ?? []);
        setAttractedVisible(24);
        setSnackBaitEffects(data.snack?.baitEffects ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setAttracted([]);
          setSnackBaitEffects([]);
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


  const attractedView = useMemo(() => {
    const q = attQuery.trim().toLowerCase();
    const bucketOrder: Record<AttractedEntry["bucket"], number> = {
      "ultra-rare": 0,
      rare: 1,
      uncommon: 2,
      common: 3,
    };
    let list = attracted.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.slug} ${p.dexNo} ${String(p.dexNo).padStart(4, "0")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (attTypes.length > 0) {
        // Intersection, capped at 2 (a Pokémon has at most 2 types).
        const own = [p.primaryType, p.secondaryType].filter(
          (t): t is string => !!t,
        );
        if (!attTypes.slice(0, 2).every((t) => own.includes(t))) return false;
      }
      if (attBuckets.length > 0 && !attBuckets.includes(p.bucket)) return false;
      return true;
    });
    const cmp: Record<typeof attSort, (a: AttractedEntry, b: AttractedEntry) => number> = {
      probability: (a, b) => b.probability - a.probability,
      dex: (a, b) => a.dexNo - b.dexNo,
      dex_desc: (a, b) => b.dexNo - a.dexNo,
      name: (a, b) => a.name.localeCompare(b.name),
      name_desc: (a, b) => b.name.localeCompare(a.name),
      bucket: (a, b) =>
        bucketOrder[a.bucket] - bucketOrder[b.bucket] || b.probability - a.probability,
    };
    list = [...list].sort(cmp[attSort]);
    return list;
  }, [attracted, attQuery, attTypes, attBuckets, attSort]);

  useEffect(() => {
    setAttractedVisible(24);
  }, [attQuery, attTypes, attBuckets, attSort]);

  /**
   * Cobblemon shiny chance = 1 / 8192 per roll. A `shiny_reroll` bait adds
   * (value) extra rolls at its own chance. P(any shiny) = 1 - ∏(1 - rollChance).
   * We accumulate over all shiny_reroll bait effects present in the pot.
   */
  const shinyMultiplier = useMemo(() => {
    let pNotShiny = 8191 / 8192; // base single roll
    for (const e of snackBaitEffects) {
      if (e.kind !== "shiny_reroll") continue;
      const rolls = Math.max(1, e.value || 1);
      const perRoll = (e.chance || 1) * (1 / 8192);
      for (let i = 0; i < rolls; i++) pNotShiny *= 1 - perRoll;
    }
    const pShiny = 1 - pNotShiny;
    return pShiny; // absolute probability per encounter
  }, [snackBaitEffects]);
  const hasShinyBoost = snackBaitEffects.some((e) => e.kind === "shiny_reroll");

  useEffect(() => {
    if (attractedVisible >= attractedView.length) return;
    const el = attractedSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setAttractedVisible((v) => Math.min(v + 24, attractedView.length));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [attractedVisible, attractedView.length]);

  const setSlot = (idx: number, s: Seasoning | null) => {
    const next = [...slots] as SlotState;
    next[idx] = s;
    setSlots(next);
  };

  const findEmptySlot = () => slots.findIndex((s) => s === null);

  const toggleFlavour = (f: string) =>
    setActiveFlavours((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <div className="space-y-8">
      <TopProgress active={loading} />
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-[auto_1fr]">
      <aside className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">{t("cookingPot")}</h3>
          <div className="mt-3 inline-flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1">
              {POT_COLOURS.map((c) => (
                <button
                  key={c.slug ?? "default"}
                  onClick={() => setPotColour(c)}
                  title={`${c.label} Cooking Pot`}
                  aria-label={`${c.label} Cooking Pot`}
                  className={`size-5 rounded-full border transition-transform ${
                    potColour.slug === c.slug
                      ? "border-accent scale-110 ring-2 ring-ring/30"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
            <div className="text-[10px] text-muted uppercase">{t("potDefault", { name: potColour.label })}</div>

            <Snack3D
              flavour={dominant}
              berries={snackBerries}
              potColour={potColour.hex}
              size={snack3DSize}
            />
            <p
              className="text-[10px] text-muted italic text-center leading-snug"
              style={{ maxWidth: snack3DSize }}
            >
              {t("previewDisclaimer")}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{t("dominant")}</span>
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

            <div className="flex gap-2 mt-1">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const slug = e.dataTransfer.getData("text/seasoning");
                    const s = seasonings.find((x) => x.slug === slug);
                    if (s && s.snackValid) setSlot(idx, s);
                  }}
                  onClick={() => setSlot(idx, null)}
                  title={slot ? `Remove ${slot.slug}` : "Drop a bait seasoning here"}
                  className={`size-16 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
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
                    <ItemIcon id={slot.itemId} size={48} />
                  ) : (
                    <span className="text-[9px] text-muted uppercase">S{idx + 1}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted uppercase">{t("seasoningSlotsCount", { count: 3 })}</div>
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("pantry")}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t("filterSeasonings")}
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
            <label className="text-[10px] uppercase text-muted flex items-center gap-1 select-none">
              <input
                type="checkbox"
                checked={validOnly}
                onChange={(e) => setValidOnly(e.target.checked)}
                className="accent-accent"
              />
              {t("baitValidOnly")}
            </label>
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
                        ? {
                            background: `${FLAVOUR_COLORS[f]}33`,
                            borderColor: FLAVOUR_COLORS[f],
                          }
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
            {pantryLoading && seasonings.length === 0 ? (
              <div className="flex flex-wrap gap-2 p-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <Skeleton key={`sk-ps-${i}`} className="size-12 rounded-md" />
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <p className="text-xs text-muted p-3">{t("noSeasoningMatch")}</p>
            ) : null}
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
                        if (!s.snackValid) return;
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
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("snackEffects")} {loading && <Spinner className="ml-2" />}
          </h3>
          <p className="mt-1 text-xs text-muted">{t("effectsHelp")}</p>
          <div className="mt-3">
            <SnackEffectsSummary effects={snackBaitEffects} />
          </div>
        </div>


        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">{t("filters")}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MultiSelect
              label={t("mods")}
              options={NAMESPACE_OPTIONS}
              value={allowedNamespaces}
              onChange={setAllowedNamespaces}
              placeholder={t("modsAny")}
            />
            <MultiSelect
              label={t("biomes")}
              options={biomeOptions}
              value={biomes}
              onChange={setBiomes}
              placeholder={t("biomesAny")}
            />
            <MultiSelect
              label={t("time")}
              options={TIME_OPTIONS}
              value={times}
              onChange={setTimes}
              placeholder={t("timeAny")}
              searchable={false}
            />
            <label className="text-xs inline-flex items-center gap-1 text-muted">
              <span className="text-[10px] uppercase tracking-wide">{t("minY")}</span>
              <input
                value={minY}
                onChange={(e) => setMinY(e.target.value)}
                inputMode="numeric"
                placeholder="-64"
                className="w-16 rounded-md border border-border bg-card px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs inline-flex items-center gap-1 text-muted">
              <span className="text-[10px] uppercase tracking-wide">{t("maxY")}</span>
              <input
                value={maxY}
                onChange={(e) => setMaxY(e.target.value)}
                inputMode="numeric"
                placeholder="320"
                className="w-16 rounded-md border border-border bg-card px-2 py-1 text-sm"
              />
            </label>
          </div>
        </div>

      </div>
      </div>

      <div className="w-full">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("attracted")} {loading && <Spinner className="ml-2" />}
          </h3>
          <div className="mt-2 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-xs">
            <div className="flex items-start gap-2">
              <span
                className="mt-0.5 inline-flex items-center justify-center size-5 rounded-full bg-amber-500 text-white font-bold text-[10px] shrink-0"
                aria-hidden
              >
                !
              </span>
              <div>
                <div className="font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide text-[10px]">
                  {t("attractedWip")}
                </div>
                <p className="mt-1 text-muted leading-relaxed">{t("attractedWipBody")}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={attQuery}
              onChange={(e) => setAttQuery(e.target.value)}
              placeholder={t("searchAttracted")}
              className="flex-1 min-w-40 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <MultiSelect
              label={t("types")}
              options={TYPE_OPTIONS}
              value={attTypes}
              onChange={setAttTypes}
              placeholder={t("typesAny")}
              maxSelection={2}
            />
            <MultiSelect
              label={t("rarity")}
              options={BUCKET_OPTIONS}
              value={attBuckets}
              onChange={setAttBuckets}
              placeholder={tc("any")}
              searchable={false}
            />
            <label className="text-xs inline-flex items-center gap-1 text-muted">
              <span className="text-[10px] uppercase tracking-wide">{tc("sort")}</span>
              <select
                value={attSort}
                onChange={(e) =>
                  setAttSort(e.target.value as typeof attSort)
                }
                className="rounded-md border border-border bg-card px-2 py-1 text-xs"
              >
                <option value="probability">{t("sortProbability")}</option>
                <option value="bucket">{t("sortBucket")}</option>
                <option value="dex">{t("sortDex")}</option>
                <option value="dex_desc">{t("sortDexDesc")}</option>
                <option value="name">{t("sortName")}</option>
                <option value="name_desc">{t("sortNameDesc")}</option>
              </select>
            </label>
            {hasShinyBoost && (
              <button
                onClick={() => setShowShiny((v) => !v)}
                aria-pressed={showShiny}
                className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${
                  showShiny
                    ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                    : "border-border text-muted hover:text-foreground"
                }`}
                title={`Shiny rate: ${(shinyMultiplier * 100).toFixed(4)}% per encounter`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${showShiny ? "text-amber-500 fill-amber-500" : ""}`}
                  aria-hidden
                />
                <span className="text-[10px] uppercase tracking-wide">{t("shiny")}</span>
              </button>
            )}
            {(attQuery || attTypes.length > 0 || attBuckets.length > 0) && (
              <button
                onClick={() => {
                  setAttQuery("");
                  setAttTypes([]);
                  setAttBuckets([]);
                }}
                className="text-xs px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
              >
                {tc("clear")}
              </button>
            )}
          </div>

          {attractedView.length === 0 ? (
            loading && attracted.length === 0 ? (
              <ul className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 auto-rows-fr">
                {Array.from({ length: 12 }).map((_, i) => (
                  <li key={`sk-att-${i}`}>
                    <AttractedCardSkeleton />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("noAttracted")}</p>
            )
          ) : (
            <ul className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 auto-rows-fr">
              {attractedView.slice(0, attractedVisible).map((p) => (
                <li key={p.slug} className="h-full">
                  <Link
                    href={`/pokemon/${p.slug}`}
                    className="h-full rounded-lg border border-border bg-card p-2 flex items-center gap-2 hover:border-accent/60 hover:bg-subtle transition-colors"
                  >
                    <PokemonSprite
                      dexNo={p.dexNo}
                      name={p.name}
                      size={44}
                      shiny={showShiny && hasShinyBoost}
                    />
                  <div className="min-w-0 flex-1 self-stretch flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-muted">
                        #{String(p.dexNo).padStart(4, "0")}
                      </span>
                      {(() => {
                        const prob = showShiny && hasShinyBoost
                          ? p.probability * shinyMultiplier
                          : p.probability;
                        const digits = prob >= 0.01 ? 2 : prob >= 0.0001 ? 4 : 6;
                        return (
                          <span
                            className={`ml-auto text-[10px] font-mono font-medium ${
                              showShiny && hasShinyBoost ? "text-amber-600 dark:text-amber-400" : "text-accent"
                            }`}
                            title={
                              showShiny && hasShinyBoost
                                ? `P(spawn) = ${(p.probability * 100).toFixed(3)}% × P(shiny) = ${(shinyMultiplier * 100).toFixed(4)}%`
                                : `base weight ${p.weight} → adjusted ${p.adjustedWeight.toFixed(1)}`
                            }
                          >
                            {(prob * 100).toFixed(digits)}%
                          </span>
                        );
                      })()}
                    </div>
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="mt-0.5 min-w-0 max-w-full overflow-hidden">
                      <TypePair primary={p.primaryType} secondary={p.secondaryType} size={16} />
                    </div>
                    <div className="text-[10px] text-muted uppercase mt-0.5">
                      {p.bucket}
                    </div>
                    {p.reasons.length > 0 && (
                      <div
                        className="text-[9px] text-accent/80 truncate"
                        title={p.reasons.join(" · ")}
                      >
                        {p.reasons.slice(0, 2).join(" · ")}
                      </div>
                    )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {attractedView.length > attractedVisible && (
            <div
              ref={attractedSentinelRef}
              className="mt-3 flex items-center justify-center gap-2 text-xs text-muted py-4"
            >
              <Spinner />
              <span>{tc("remaining", { count: attractedView.length - attractedVisible })}</span>
            </div>
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
  const flavourLabel = seasoning.dominantFlavour ?? seasoning.category;
  const effectCount = seasoning.baitEffects?.length ?? 0;

  useLayoutEffect(() => {
    if (!hovered || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tooltipW = 280;
    const tooltipH = Math.max(140, 60 + 40 * Math.max(1, effectCount));
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const flipAbove = rect.bottom + tooltipH + 8 > vh;
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    if (left < 8) left = 8;
    if (left + tooltipW > vw - 8) left = vw - 8 - tooltipW;

    if (flipAbove) {
      setPlacement({ top: rect.top - tooltipH - 8, left });
    } else {
      setPlacement({ top: rect.bottom + 4, left });
    }
  }, [hovered, effectCount]);

  return (
    <>
      <button
        ref={anchorRef}
        draggable={seasoning.snackValid}
        onDragStart={(e) => {
          if (!seasoning.snackValid) {
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
        title={`${seasoning.slug} · ${flavourLabel}${seasoning.snackValid ? "" : " (not a bait seasoning)"}`}
        className={`size-12 rounded border transition-colors flex items-center justify-center relative ${
          selected
            ? "border-accent ring-2 ring-ring/30 bg-subtle"
            : seasoning.snackValid
              ? "border-border bg-card hover:border-accent cursor-pointer"
              : "border-border bg-card opacity-50 cursor-help"
        }`}
      >
        <ItemIcon id={seasoning.itemId} size={40} />
        {!seasoning.snackValid && (
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-muted/60 border border-border" />
        )}
        {seasoning.snackValid && effectCount > 0 && (
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-accent text-accent-foreground text-[9px] leading-4 text-center font-mono">
            {effectCount}
          </span>
        )}
      </button>
      {hovered && (
        <div
          style={{ position: "fixed", ...placement, width: 280, zIndex: 60 }}
          className="p-3 rounded-lg border border-border bg-card shadow-lg pointer-events-none"
        >
          <div className="flex items-center gap-2">
            <ItemIcon id={seasoning.itemId} size={24} />
            <div className="font-medium capitalize min-w-0 truncate">
              {seasoning.slug.replaceAll("_", " ")}
            </div>
            <span
              className="ml-auto shrink-0 text-[10px] uppercase px-1.5 py-0.5 rounded-full"
              style={{ background: `${FLAVOUR_COLORS[flavourLabel] ?? "#888"}33` }}
            >
              {flavourLabel}
            </span>
          </div>
          {seasoning.kind === "berry" &&
            Object.values(seasoning.flavours).some((v) => v > 0) && (
              <div className="mt-1 text-[10px] text-muted font-mono">
                {Object.entries(seasoning.flavours)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${k.slice(0, 3)} ${v}`)
                  .join(" · ")}
              </div>
            )}
          {!seasoning.snackValid && (
            <div className="mt-1 text-[10px] uppercase text-amber-700 dark:text-amber-300">
              ✗ not a bait seasoning
            </div>
          )}
          {seasoning.snackValid && effectCount === 0 && (
            <div className="mt-1 text-[10px] uppercase text-muted">
              Bait-valid, no documented effect
            </div>
          )}
          {effectCount > 0 && (
            <ul className="mt-2 space-y-1">
              {seasoning.baitEffects.map((e, i) => (
                <li
                  key={`${e.kind}-${i}`}
                  className={`rounded px-2 py-1 text-[10px] leading-tight ${EFFECT_TONE_STYLES[e.tone]}`}
                >
                  <span className="font-medium">{e.title}</span>
                  {e.chance < 1 && (
                    <span className="ml-1 opacity-70">
                      {Math.round(e.chance * 100)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {seasoning.description && effectCount === 0 && (
            <p className="mt-2 text-xs text-muted leading-snug">{seasoning.description}</p>
          )}
        </div>
      )}
    </>
  );
}
