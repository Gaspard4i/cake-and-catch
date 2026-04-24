"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { BerryDebugOverrides, BerryPlacement } from "@/components/Snack3D";

const ZERO_OVERRIDES: BerryDebugOverrides = {
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  rotOffsetX: 0,
  rotOffsetY: 0,
  rotOffsetZ: 0,
  scaleFactorY: -1,
};

const DebugViewer = dynamic(
  () => import("./DebugViewer").then((m) => m.DebugViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[70vh] rounded-lg border border-border bg-subtle flex items-center justify-center text-muted text-sm">
        Loading 3D…
      </div>
    ),
  },
);

type BerryDto = BerryPlacement & {
  snackValid?: boolean;
};

/**
 * Debug page at /debug/snack. Large canvas with OrbitControls, axes
 * helper, and a berry picker so you can see exactly how the mod-faithful
 * snack renders with 1/2/3 berries. Not linked from the main nav.
 */
export default function SnackDebugPage() {
  const [berries, setBerries] = useState<BerryDto[]>([]);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [wireSnack, setWireSnack] = useState(false);
  const [potColour, setPotColour] = useState<string>("#c9b89e");
  const [overrides, setOverrides] = useState<BerryDebugOverrides>(ZERO_OVERRIDES);

  const setOv = <K extends keyof BerryDebugOverrides>(
    k: K,
    v: BerryDebugOverrides[K],
  ) => setOverrides((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch("/api/snack")
      .then((r) => r.json())
      .then((d: { seasonings?: BerryDto[] }) => {
        const list = (d.seasonings ?? []).filter(
          (s) => s.snackValid && s.fruitModel && s.snackPositionings?.length,
        );
        setBerries(list);
      });
  }, []);

  const selected = useMemo(
    () =>
      slugs
        .map((s) => berries.find((b) => b.slug === s))
        .filter((b): b is BerryDto => !!b),
    [slugs, berries],
  );

  const add = (s: BerryDto) => {
    setSlugs((prev) => (prev.length >= 3 ? prev : [...prev, s.slug]));
  };
  const removeAt = (i: number) =>
    setSlugs((prev) => prev.filter((_, idx) => idx !== i));
  const quickFill = (n: 1 | 2 | 3) => {
    if (berries.length === 0) return;
    const first = berries.find((b) => b.slug === "oran_berry") ?? berries[0];
    setSlugs(Array.from({ length: n }, () => first.slug));
  };

  return (
    <div className="px-3 py-3 h-[calc(100vh-56px)] flex flex-col">
      <header className="flex items-baseline gap-3 flex-wrap mb-2">
        <h1 className="text-lg font-semibold tracking-tight">Snack 3D debug</h1>
        <p className="text-[11px] text-muted">
          drag=rotate · scroll=zoom · right-drag=pan — tune placements live
          with the sliders on the right.
        </p>
      </header>

      <div className="flex-1 grid gap-3 min-h-0 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_520px]">
        <DebugViewer
          berries={selected}
          showAxes={showAxes}
          showGrid={showGrid}
          wireSnack={wireSnack}
          potColour={potColour}
          overrides={overrides}
        />

        <aside className="overflow-y-auto pr-1 grid gap-3 grid-cols-1 auto-rows-min content-start">
          {/* Top compact panel: quick fill + selected + helpers in a row. */}
          <section className="rounded-lg border border-border bg-card p-2 space-y-2">
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => quickFill(1)}
                className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-subtle"
              >
                1
              </button>
              <button
                onClick={() => quickFill(2)}
                className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-subtle"
              >
                2
              </button>
              <button
                onClick={() => quickFill(3)}
                className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-subtle"
              >
                3
              </button>
              <button
                onClick={() => setSlugs([])}
                className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-subtle"
              >
                Clear
              </button>
            </div>

            {selected.length === 0 ? (
              <p className="text-[11px] text-muted px-1">
                No berries on the snack.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {selected.map((b, i) => (
                  <li
                    key={`${b.slug}-${i}`}
                    className="flex items-center gap-1.5 text-[11px] rounded px-1.5 py-0.5 bg-subtle"
                  >
                    <span className="font-mono text-[9px] text-muted">
                      #{i}
                    </span>
                    <span className="flex-1 capitalize truncate">
                      {b.slug.replaceAll("_", " ")}
                    </span>
                    <PositioningPreview b={b} i={i} total={selected.length} />
                    <button
                      onClick={() => removeAt(i)}
                      className="text-muted hover:text-red-500 leading-none"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wide text-muted">
                Live overrides
              </h2>
              <button
                onClick={() => setOverrides(ZERO_OVERRIDES)}
                className="text-[10px] uppercase text-muted hover:text-foreground"
              >
                Reset
              </button>
            </div>
            <p className="text-[10px] text-muted leading-relaxed">
              Offsets in world units (1 = block = 16 MC px). Rotations in
              degrees, added on top of JSON. Scale Y sign flips the berry
              (-1 = mod default, +1 = raw).
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <DebugSlider
                label="off X"
                value={overrides.offsetX ?? 0}
                min={-0.5}
                max={0.5}
                step={1 / 32}
                onChange={(v) => setOv("offsetX", v)}
              />
              <DebugSlider
                label="rot X"
                value={overrides.rotOffsetX ?? 0}
                min={-180}
                max={180}
                step={5}
                unit="°"
                onChange={(v) => setOv("rotOffsetX", v)}
              />
              <DebugSlider
                label="off Y"
                value={overrides.offsetY ?? 0}
                min={-0.5}
                max={0.5}
                step={1 / 32}
                onChange={(v) => setOv("offsetY", v)}
              />
              <DebugSlider
                label="rot Y"
                value={overrides.rotOffsetY ?? 0}
                min={-180}
                max={180}
                step={5}
                unit="°"
                onChange={(v) => setOv("rotOffsetY", v)}
              />
              <DebugSlider
                label="off Z"
                value={overrides.offsetZ ?? 0}
                min={-0.5}
                max={0.5}
                step={1 / 32}
                onChange={(v) => setOv("offsetZ", v)}
              />
              <DebugSlider
                label="rot Z"
                value={overrides.rotOffsetZ ?? 0}
                min={-180}
                max={180}
                step={5}
                unit="°"
                onChange={(v) => setOv("rotOffsetZ", v)}
              />
              <DebugSlider
                label="scale Y"
                value={overrides.scaleFactorY ?? -1}
                min={-2}
                max={2}
                step={0.1}
                onChange={(v) => setOv("scaleFactorY", v)}
              />
            </div>
            <details className="text-[9px]">
              <summary className="text-muted cursor-pointer">JSON</summary>
              <pre className="text-muted bg-subtle p-1.5 rounded overflow-x-auto mt-1">
{JSON.stringify(overrides, null, 2)}
              </pre>
            </details>
          </section>

          {/* Compact helpers row. */}
          <section className="rounded-lg border border-border bg-card p-2 flex items-center gap-3 flex-wrap text-[11px]">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
              />
              Axes
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={wireSnack}
                onChange={(e) => setWireSnack(e.target.checked)}
              />
              Wire
            </label>
            <label className="flex items-center gap-1 ml-auto">
              <span className="text-muted">Pot</span>
              <input
                type="color"
                value={potColour}
                onChange={(e) => setPotColour(e.target.value)}
                className="h-5 w-8 rounded border border-border"
              />
            </label>
          </section>

          <section className="rounded-lg border border-border bg-card p-2 space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wide text-muted">
                Berries ({berries.length})
              </h2>
            </div>
            <ul className="grid grid-cols-2 gap-0.5 max-h-[calc(100vh-520px)] min-h-[160px] overflow-y-auto">
              {berries.map((b) => (
                <li key={b.slug}>
                  <button
                    onClick={() => add(b)}
                    disabled={slugs.length >= 3}
                    className="w-full text-left text-[11px] px-1.5 py-0.5 rounded hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed capitalize truncate"
                    title={b.slug}
                  >
                    {b.slug.replaceAll("_", " ")}
                    <span className="text-muted text-[9px] ml-1">
                      ({b.snackPositionings?.length ?? 0})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DebugSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block leading-tight">
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {value.toFixed(value >= 1 || value <= -1 ? 0 : 2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent h-3"
      />
    </label>
  );
}

function PositioningPreview({
  b,
  i,
  total,
}: {
  b: BerryDto;
  i: number;
  total: number;
}) {
  const positionings = b.snackPositionings ?? [];
  if (positionings.length === 0) return null;
  const p =
    total === 1
      ? positionings[0]
      : total === 2
        ? positionings[0]
        : positionings[Math.min(i, positionings.length - 1)];
  if (!p) return null;
  const title = `pos=(${p.position.x}, ${p.position.y}, ${p.position.z}) rot=(${p.rotation.x}°, ${p.rotation.y}°, ${p.rotation.z}°)`;
  return (
    <code className="font-mono text-[9px] text-muted" title={title}>
      y={p.position.y}
    </code>
  );
}
