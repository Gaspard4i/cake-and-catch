"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { BerryPlacement } from "@/components/Snack3D";

const PivotViewer = dynamic(
  () => import("./PivotViewer").then((m) => m.PivotViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full rounded-lg border border-border bg-subtle flex items-center justify-center text-muted text-sm">
        Loading 3D…
      </div>
    ),
  },
);

type BerryDto = BerryPlacement & { snackValid?: boolean };

type Pivot = { cx: number; cy: number; cz: number };

const ZERO_PIVOT: Pivot = { cx: 0, cy: 0, cz: 0 };

/**
 * /debug/berry-pivot — pivot editor.
 *
 * One berry at a time, no snack around it. Drag the sliders to define
 * where the model's centre is in cube space; the geometry is translated
 * by -(cx, cy, cz) so that exact pixel ends up at world origin (0,0,0).
 * A red cross marks the origin so you can see, visually, where the
 * pivot lands. When happy, hit "Copy JSON" and paste the line into
 * src/lib/snack/berry-pivots.ts.
 */
export default function BerryPivotPage() {
  const [berries, setBerries] = useState<BerryDto[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [pivot, setPivot] = useState<Pivot>(ZERO_PIVOT);
  const [autoBottom, setAutoBottom] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [bbox, setBbox] = useState<{
    min: [number, number, number];
    max: [number, number, number];
  } | null>(null);

  useEffect(() => {
    fetch("/api/snack")
      .then((r) => r.json())
      .then((d: { seasonings?: BerryDto[] }) => {
        const list = (d.seasonings ?? []).filter(
          (s) => s.snackValid && s.fruitModel,
        );
        setBerries(list);
        if (!slug && list.length > 0) setSlug(list[0].slug);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const berry = useMemo(
    () => berries.find((b) => b.slug === slug) ?? null,
    [berries, slug],
  );

  // When the user picks a new berry, snap the pivot to its bbox bottom
  // (a sensible starting point) so the slider deltas stay small.
  useEffect(() => {
    if (!bbox) return;
    if (autoBottom) {
      setPivot({
        cx: (bbox.min[0] + bbox.max[0]) / 2,
        cy: bbox.min[1],
        cz: (bbox.min[2] + bbox.max[2]) / 2,
      });
    }
  }, [bbox, autoBottom]);

  const onBboxComputed = (b: typeof bbox) => setBbox(b);

  return (
    <div className="px-3 py-3 h-[calc(100vh-56px)] flex flex-col">
      <header className="flex items-baseline gap-3 flex-wrap mb-2">
        <h1 className="text-lg font-semibold tracking-tight">
          Berry pivot editor
        </h1>
        <p className="text-[11px] text-muted">
          Drag to move (cx, cy, cz); the red cross is the origin. Place
          the cross where you want the berry's centre, then Copy JSON.
        </p>
      </header>

      <div className="flex-1 grid gap-3 min-h-0 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px]">
        {berry ? (
          <PivotViewer
            slug={berry.slug}
            fruitModel={berry.fruitModel ?? ""}
            fruitTexture={berry.fruitTexture ?? null}
            itemId={berry.itemId}
            pivot={pivot}
            showAxes={showAxes}
            showGrid={showGrid}
            onBboxComputed={onBboxComputed}
          />
        ) : (
          <div className="rounded-lg border border-border bg-subtle flex items-center justify-center text-muted text-sm">
            No berry selected
          </div>
        )}

        <aside className="overflow-y-auto pr-1 grid gap-3 grid-cols-1 auto-rows-min content-start">
          <section className="rounded-lg border border-border bg-card p-2 space-y-2">
            <label className="block text-[11px]">
              <span className="text-muted uppercase tracking-wide text-[10px]">
                Berry
              </span>
              <select
                value={slug ?? ""}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setPivot(ZERO_PIVOT);
                  setBbox(null);
                }}
                className="block w-full mt-0.5 text-[12px] bg-subtle border border-border rounded px-1.5 py-1 text-foreground"
              >
                {berries.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.slug.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            {bbox && (
              <div className="text-[10px] text-muted font-mono leading-relaxed">
                bbox X [{bbox.min[0].toFixed(2)} → {bbox.max[0].toFixed(2)}]<br />
                bbox Y [{bbox.min[1].toFixed(2)} → {bbox.max[1].toFixed(2)}]<br />
                bbox Z [{bbox.min[2].toFixed(2)} → {bbox.max[2].toFixed(2)}]
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wide text-muted">
                Pivot (cube space, MC pixels)
              </h2>
              <button
                onClick={() => copyPivotJson(slug ?? "", pivot)}
                disabled={!slug}
                className="text-[10px] uppercase text-muted hover:text-foreground disabled:opacity-30"
              >
                Copy JSON
              </button>
            </div>

            <div className="grid grid-cols-1 gap-y-1">
              <PivotSlider
                label="cx"
                value={pivot.cx}
                bmin={bbox?.min[0] ?? -8}
                bmax={bbox?.max[0] ?? 8}
                onChange={(v) => setPivot((p) => ({ ...p, cx: v }))}
              />
              <PivotSlider
                label="cy"
                value={pivot.cy}
                bmin={bbox?.min[1] ?? -8}
                bmax={bbox?.max[1] ?? 8}
                onChange={(v) => setPivot((p) => ({ ...p, cy: v }))}
              />
              <PivotSlider
                label="cz"
                value={pivot.cz}
                bmin={bbox?.min[2] ?? -8}
                bmax={bbox?.max[2] ?? 8}
                onChange={(v) => setPivot((p) => ({ ...p, cz: v }))}
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setPivot(ZERO_PIVOT)}
                className="text-[10px] px-2 py-1 rounded border border-border hover:bg-subtle"
              >
                Zero
              </button>
              <button
                onClick={() =>
                  bbox &&
                  setPivot({
                    cx: (bbox.min[0] + bbox.max[0]) / 2,
                    cy: bbox.min[1],
                    cz: (bbox.min[2] + bbox.max[2]) / 2,
                  })
                }
                disabled={!bbox}
                className="text-[10px] px-2 py-1 rounded border border-border hover:bg-subtle disabled:opacity-30"
              >
                Bottom-centre
              </button>
              <button
                onClick={() =>
                  bbox &&
                  setPivot({
                    cx: (bbox.min[0] + bbox.max[0]) / 2,
                    cy: (bbox.min[1] + bbox.max[1]) / 2,
                    cz: (bbox.min[2] + bbox.max[2]) / 2,
                  })
                }
                disabled={!bbox}
                className="text-[10px] px-2 py-1 rounded border border-border hover:bg-subtle disabled:opacity-30"
              >
                Bbox-centre
              </button>
              <label className="text-[10px] flex items-center gap-1 ml-auto">
                <input
                  type="checkbox"
                  checked={autoBottom}
                  onChange={(e) => setAutoBottom(e.target.checked)}
                />
                Auto-bottom on switch
              </label>
            </div>

            <details className="text-[9px]">
              <summary className="text-muted cursor-pointer">JSON</summary>
              <pre className="text-muted bg-subtle p-1.5 rounded overflow-x-auto mt-1">
{slug ? `${slug}: ${JSON.stringify({
  cx: round(pivot.cx),
  cy: round(pivot.cy),
  cz: round(pivot.cz),
})},` : ""}
              </pre>
            </details>
          </section>

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
          </section>
        </aside>
      </div>
    </div>
  );
}

function round(n: number, p = 4) {
  return Number.parseFloat(n.toFixed(p));
}

function copyPivotJson(slug: string, p: Pivot) {
  if (!slug) return;
  const json = `${slug}: ${JSON.stringify({
    cx: round(p.cx),
    cy: round(p.cy),
    cz: round(p.cz),
  })},`;
  navigator.clipboard?.writeText(json).catch(() => {});
  // eslint-disable-next-line no-console
  console.log("[berry-pivots]", json);
}

function PivotSlider({
  label,
  value,
  bmin,
  bmax,
  onChange,
}: {
  label: string;
  value: number;
  bmin: number;
  bmax: number;
  onChange: (v: number) => void;
}) {
  // Pad the slider range slightly beyond the bbox so the user can park
  // the pivot just outside the model if needed.
  const pad = Math.max(1, (bmax - bmin) * 0.25);
  const min = bmin - pad;
  const max = bmax + pad;
  return (
    <label className="block leading-tight">
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent h-3"
      />
    </label>
  );
}
