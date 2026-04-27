"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BerryBbox } from "@/components/Berry3D";

const Berry3D = dynamic(
  () => import("@/components/Berry3D").then((m) => m.Berry3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full rounded-lg border border-border bg-subtle flex items-center justify-center text-muted text-sm">
        Loading 3D…
      </div>
    ),
  },
);

type Pivot = { cx: number; cy: number; cz: number };
const ZERO_PIVOT: Pivot = { cx: 0, cy: 0, cz: 0 };

type Registry = Record<string, Partial<Pivot>>;

type Props = {
  slug: string;
  itemId: string;
  fruitModel: string;
  fruitTexture: string | null;
  slugs: string[];
};

export function BerryDebugClient(props: Props) {
  const { slug, itemId, fruitModel, fruitTexture, slugs } = props;

  const [registry, setRegistry] = useState<Registry>({});
  const [pivot, setPivot] = useState<Pivot>(ZERO_PIVOT);
  const [bbox, setBbox] = useState<BerryBbox | null>(null);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [centered, setCentered] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load registry once.
  useEffect(() => {
    fetch("/api/debug/berry-pivots")
      .then((r) => (r.ok ? r.json() : { pivots: {} }))
      .then((d: { pivots?: Registry }) => setRegistry(d.pivots ?? {}))
      .catch(() => {});
  }, []);

  // When slug or registry changes, prefill pivot from saved entry.
  useEffect(() => {
    const saved = registry[slug];
    if (saved) {
      setPivot({ cx: saved.cx ?? 0, cy: saved.cy ?? 0, cz: saved.cz ?? 0 });
    } else {
      setPivot(ZERO_PIVOT);
    }
  }, [slug, registry]);

  // Debounced autosave.
  useEffect(() => {
    const same =
      registry[slug]?.cx === pivot.cx &&
      registry[slug]?.cy === pivot.cy &&
      registry[slug]?.cz === pivot.cz;
    if (same) return;
    const next: Registry = {
      ...registry,
      [slug]: { ...(registry[slug] ?? {}), cx: pivot.cx, cy: pivot.cy, cz: pivot.cz },
    };
    setSaveState("saving");
    const t = setTimeout(() => {
      fetch("/api/debug/berry-pivots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pivots: next }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          setRegistry(next);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 400);
    return () => clearTimeout(t);
    // registry intentionally omitted — we don't want to retrigger when we
    // setRegistry(next) at the end of the save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pivot.cx, pivot.cy, pivot.cz, slug]);

  const idx = slugs.indexOf(slug);
  const prev = idx > 0 ? slugs[idx - 1] : null;
  const next = idx >= 0 && idx < slugs.length - 1 ? slugs[idx + 1] : null;

  const customPivot = useMemo<Pivot | null>(() => {
    // When "centered" is on, let Berry3D auto-center via its bbox so the user
    // sees the model neatly framed. We then disable the slider feedback (the
    // saved pivot is what gets shipped). When "centered" is off, the slider
    // pivot wins.
    if (centered) return null;
    return pivot;
  }, [centered, pivot]);

  return (
    <div className="px-3 py-3 h-[calc(100vh-56px)] flex flex-col">
      <header className="flex items-baseline gap-3 flex-wrap mb-2">
        <h1 className="text-lg font-semibold tracking-tight">
          Berry debug · <span className="capitalize">{slug.replace(/_/g, " ")}</span>
        </h1>
        <Link
          href={`/berry/${slug}`}
          className="text-[11px] text-muted hover:text-foreground"
        >
          public page →
        </Link>
        <p className="text-[11px] text-muted ml-auto">
          {saveState === "saving" && <span>saving…</span>}
          {saveState === "saved" && <span className="text-green-600">saved</span>}
          {saveState === "error" && <span className="text-red-500">save failed</span>}
          {saveState === "idle" && (
            <span>{Object.keys(registry).length} berries saved</span>
          )}
        </p>
      </header>

      <div className="flex-1 grid gap-3 min-h-0 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px]">
        <Berry3D
          slug={slug}
          itemId={itemId}
          fruitModel={fruitModel}
          fruitTexture={fruitTexture}
          centered={centered}
          customPivot={customPivot}
          showAxes={showAxes}
          showGrid={showGrid}
          showOrigin={!centered}
          onBboxComputed={setBbox}
          className="rounded-lg border border-border bg-subtle overflow-hidden h-full min-h-[500px] relative"
        />

        <aside className="overflow-y-auto pr-1 grid gap-3 grid-cols-1 auto-rows-min content-start">
          <section className="rounded-lg border border-border bg-card p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted uppercase tracking-wide text-[10px]">
                Berry
              </span>
              <div className="flex gap-1">
                {prev && (
                  <Link
                    href={`/debug/berry/${prev}`}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-subtle"
                  >
                    ← prev
                  </Link>
                )}
                {next && (
                  <Link
                    href={`/debug/berry/${next}`}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-subtle"
                  >
                    next →
                  </Link>
                )}
              </div>
            </div>
            <select
              value={slug}
              onChange={(e) => {
                if (e.target.value !== slug) {
                  window.location.href = `/debug/berry/${e.target.value}`;
                }
              }}
              className="block w-full text-[12px] bg-subtle border border-border rounded px-1.5 py-1 text-foreground"
            >
              {slugs.map((s) => (
                <option key={s} value={s}>
                  {registry[s] ? "✓ " : "  "}
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

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
                Pivot (cube space, MC px)
              </h2>
              <button
                onClick={() => {
                  const nextR = { ...registry };
                  delete nextR[slug];
                  setRegistry(nextR);
                  setPivot(ZERO_PIVOT);
                  fetch("/api/debug/berry-pivots", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ pivots: nextR }),
                  }).catch(() => {});
                }}
                className="text-[10px] uppercase text-muted hover:text-foreground"
                title="Remove this berry's pivot from the registry"
              >
                Clear
              </button>
            </div>

            <p className="text-[10px] text-muted leading-relaxed">
              Move (cx, cy, cz) so the red cross sits on the spot you want
              placed on the snack top face. Saves auto to{" "}
              <code className="font-mono">berry-pivots.ts</code>.
            </p>

            <div className="grid grid-cols-1 gap-y-1">
              <PivotSlider
                label="cx"
                value={pivot.cx}
                bmin={bbox?.min[0] ?? -8}
                bmax={bbox?.max[0] ?? 8}
                disabled={centered}
                onChange={(v) => setPivot((p) => ({ ...p, cx: v }))}
              />
              <PivotSlider
                label="cy"
                value={pivot.cy}
                bmin={bbox?.min[1] ?? -8}
                bmax={bbox?.max[1] ?? 8}
                disabled={centered}
                onChange={(v) => setPivot((p) => ({ ...p, cy: v }))}
              />
              <PivotSlider
                label="cz"
                value={pivot.cz}
                bmin={bbox?.min[2] ?? -8}
                bmax={bbox?.max[2] ?? 8}
                disabled={centered}
                onChange={(v) => setPivot((p) => ({ ...p, cz: v }))}
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setPivot(ZERO_PIVOT)}
                disabled={centered}
                className="text-[10px] px-2 py-1 rounded border border-border hover:bg-subtle disabled:opacity-30"
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
                disabled={!bbox || centered}
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
                disabled={!bbox || centered}
                className="text-[10px] px-2 py-1 rounded border border-border hover:bg-subtle disabled:opacity-30"
              >
                Bbox-centre
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-2 flex items-center gap-3 flex-wrap text-[11px]">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={centered}
                onChange={(e) => setCentered(e.target.checked)}
              />
              Centred (auto)
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
              />
              Axes
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
          </section>

          <details className="text-[9px]">
            <summary className="text-muted cursor-pointer pl-2">JSON</summary>
            <pre className="text-muted bg-subtle p-1.5 rounded overflow-x-auto mt-1">
{`${slug}: ${JSON.stringify({
  cx: round(pivot.cx),
  cy: round(pivot.cy),
  cz: round(pivot.cz),
})},`}
            </pre>
          </details>
        </aside>
      </div>
    </div>
  );
}

function round(n: number, p = 4) {
  return Number.parseFloat(n.toFixed(p));
}

function PivotSlider({
  label,
  value,
  bmin,
  bmax,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  bmin: number;
  bmax: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const pad = Math.max(1, (bmax - bmin) * 0.25);
  const min = bmin - pad;
  const max = bmax + pad;
  return (
    <label className={`block leading-tight ${disabled ? "opacity-40" : ""}`}>
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
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent h-3"
      />
    </label>
  );
}
