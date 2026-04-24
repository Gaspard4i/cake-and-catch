"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { BerryPlacement } from "@/components/Snack3D";

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
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Snack 3D debug
      </h1>
      <p className="mt-2 text-sm text-muted max-w-2xl">
        Hidden debug page. Large canvas with OrbitControls (drag = rotate,
        scroll = zoom, right-drag = pan), axes + grid helpers, wireframe
        toggle. Use the quick-fill buttons to sanity-check 1/2/3 berry
        layouts against the in-game renderer.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <DebugViewer
          berries={selected}
          showAxes={showAxes}
          showGrid={showGrid}
          wireSnack={wireSnack}
          potColour={potColour}
        />

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-3 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">
              Quick fill
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => quickFill(1)}
                className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border hover:bg-subtle"
              >
                1 berry
              </button>
              <button
                onClick={() => quickFill(2)}
                className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border hover:bg-subtle"
              >
                2 berries
              </button>
              <button
                onClick={() => quickFill(3)}
                className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border hover:bg-subtle"
              >
                3 berries
              </button>
              <button
                onClick={() => setSlugs([])}
                className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-subtle"
              >
                Clear
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-3 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">
              Selected ({selected.length}/3)
            </h2>
            {selected.length === 0 ? (
              <p className="text-xs text-muted">No berries on the snack.</p>
            ) : (
              <ul className="space-y-1">
                {selected.map((b, i) => (
                  <li
                    key={`${b.slug}-${i}`}
                    className="flex items-center gap-2 text-xs rounded px-2 py-1 bg-subtle"
                  >
                    <span className="font-mono text-[10px] text-muted">
                      #{i}
                    </span>
                    <span className="flex-1 capitalize truncate">
                      {b.slug.replaceAll("_", " ")}
                    </span>
                    <PositioningPreview b={b} i={i} total={selected.length} />
                    <button
                      onClick={() => removeAt(i)}
                      className="text-muted hover:text-red-500"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-3 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">
              Berries ({berries.length})
            </h2>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {berries.map((b) => (
                <button
                  key={b.slug}
                  onClick={() => add(b)}
                  disabled={slugs.length >= 3}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="capitalize">{b.slug.replaceAll("_", " ")}</span>
                  <span className="text-muted ml-1">
                    ({b.snackPositionings?.length ?? 0})
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-3 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted">
              Helpers
            </h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
              />
              Axes (R=X G=Y B=Z)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={wireSnack}
                onChange={(e) => setWireSnack(e.target.checked)}
              />
              Wireframe snack
            </label>
            <label className="flex items-center gap-2 text-xs">
              <span>Pot colour</span>
              <input
                type="color"
                value={potColour}
                onChange={(e) => setPotColour(e.target.value)}
                className="h-6 w-10"
              />
              <code className="font-mono text-[10px] text-muted">{potColour}</code>
            </label>
          </section>
        </aside>
      </div>
    </div>
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
