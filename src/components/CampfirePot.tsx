"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemIcon } from "./ItemIcon";
import { PokemonSprite } from "./PokemonSprite";
import { TypePair } from "./TypeBadge";

type Berry = {
  slug: string;
  itemId: string;
  colour: string | null;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
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
  { value: "", label: "— any —" },
  { value: "#cobblemon:is_plains", label: "Plains" },
  { value: "#cobblemon:is_forest", label: "Forest" },
  { value: "#cobblemon:is_jungle", label: "Jungle" },
  { value: "#cobblemon:is_savanna", label: "Savanna" },
  { value: "#cobblemon:is_ocean", label: "Ocean" },
  { value: "#cobblemon:is_desert", label: "Desert" },
  { value: "#cobblemon:is_mountain", label: "Mountain" },
  { value: "#cobblemon:is_snowy", label: "Snowy" },
  { value: "#cobblemon:is_swamp", label: "Swamp" },
];

const TIMES = [
  { value: "", label: "— any —" },
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "morning", label: "Morning" },
  { value: "noon", label: "Noon" },
  { value: "dusk", label: "Dusk" },
];

export function CampfirePot() {
  const [berries, setBerries] = useState<Berry[]>([]);
  const [slot, setSlot] = useState<Berry | null>(null);
  const [biome, setBiome] = useState<string>("");
  const [minY, setMinY] = useState<string>("");
  const [maxY, setMaxY] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [attracted, setAttracted] = useState<AttractedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    fetch("/api/cake")
      .then((r) => r.json())
      .then((d: { berries: Berry[] }) => setBerries(d.berries));
  }, []);

  const filteredBerries = useMemo(() => {
    if (!filterQuery) return berries;
    const q = filterQuery.toLowerCase();
    return berries.filter((b) => b.slug.includes(q));
  }, [berries, filterQuery]);

  // Debounced query
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const body = {
          composition: { seasoningSlugs: slot ? [slot.slug] : [] },
          filter: {
            biome: biome || undefined,
            minY: minY ? Number.parseInt(minY, 10) : undefined,
            maxY: maxY ? Number.parseInt(maxY, 10) : undefined,
            timeRange: time || undefined,
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
        if ((err as Error).name !== "AbortError") setAttracted([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [slot, biome, minY, maxY, time]);

  const dominant =
    slot && slot.dominantFlavour ? slot.dominantFlavour : "—";

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <aside className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Pot</h3>
          <div className="mt-3 inline-flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card">
            {/* Slot seasoning */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const slug = e.dataTransfer.getData("text/berry");
                const b = berries.find((x) => x.slug === slug);
                if (b) setSlot(b);
              }}
              onClick={() => setSlot(null)}
              title={slot ? `Remove ${slot.slug}` : "Drop a berry here"}
              className={`size-24 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
                slot
                  ? "border-accent bg-subtle"
                  : "border-dashed border-border bg-subtle/50 hover:bg-subtle"
              }`}
            >
              {slot ? (
                <ItemIcon id={slot.itemId} size={72} />
              ) : (
                <span className="text-[10px] text-muted uppercase text-center px-2">
                  Drop berry
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted uppercase">Seasoning slot</div>

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

            <div className="text-xs text-muted">
              Dominant: <span className="text-foreground font-mono uppercase">{dominant}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            Pantry — berries
          </h3>
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter berries…"
            className="mt-2 w-full max-w-sm rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <div className="mt-3 flex flex-wrap gap-2 max-h-52 overflow-y-auto p-2 rounded-lg border border-border bg-subtle">
            {filteredBerries.map((b) => (
              <button
                key={b.slug}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/berry", b.slug)}
                onClick={() => setSlot(b)}
                title={`${b.slug} · ${b.dominantFlavour ?? "—"}`}
                className={`size-12 rounded border bg-card hover:border-accent transition-colors ${
                  slot?.slug === b.slug ? "border-accent ring-2 ring-ring/30" : "border-border"
                }`}
              >
                <ItemIcon id={b.itemId} size={40} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Filters</h3>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="text-xs">
              <span className="block text-muted mb-1">Biome</span>
              <select
                value={biome}
                onChange={(e) => setBiome(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
              >
                {BIOME_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="text-xs">
              <span className="block text-muted mb-1">Time</span>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm"
              >
                {TIMES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            Attracted Pokémon {loading && "…"}
          </h3>
          <p className="mt-1 text-xs text-muted">
            Pokémon who can spawn in the chosen conditions AND whose preferred flavour matches
            the cake (derived from their type when the mod does not declare it).
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
                  <PokemonSprite dexNo={p.dexNo} name={p.name} size={44} />
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
