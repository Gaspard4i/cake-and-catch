"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Berry3D = dynamic(
  () => import("@/components/Berry3D").then((m) => m.Berry3D),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-subtle h-[360px] flex items-center justify-center text-muted text-sm">
        Loading 3D…
      </div>
    ),
  },
);

type Props = {
  slug: string;
  fruitModel: string;
  fruitTexture: string | null;
  itemId: string;
};

export function BerryViewer(props: Props) {
  const [spin, setSpin] = useState(true);
  // Bumping this key remounts the canvas — used to "Reset view" so OrbitControls
  // returns to the camera default.
  const [resetKey, setResetKey] = useState(0);

  if (!props.fruitModel) {
    return (
      <div className="rounded-lg border border-border bg-subtle h-[360px] flex items-center justify-center text-muted text-sm">
        No 3D model available.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-[360px]">
        <Berry3D
          key={resetKey}
          slug={props.slug}
          fruitModel={props.fruitModel}
          fruitTexture={props.fruitTexture}
          itemId={props.itemId}
          centered
          spin={spin}
          className="rounded-lg border border-border bg-subtle overflow-hidden h-full relative"
        />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={spin}
            onChange={(e) => setSpin(e.target.checked)}
          />
          Auto-rotate
        </label>
        <button
          onClick={() => setResetKey((k) => k + 1)}
          className="ml-auto px-2 py-0.5 rounded border border-border hover:bg-subtle"
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
