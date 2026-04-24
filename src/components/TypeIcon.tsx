"use client";

import { useState } from "react";

const TYPE_COLORS: Record<string, string> = {
  normal: "bg-zinc-400/20",
  fire: "bg-orange-500/20",
  water: "bg-sky-500/20",
  electric: "bg-yellow-400/25",
  grass: "bg-emerald-500/20",
  ice: "bg-cyan-400/20",
  fighting: "bg-red-700/25",
  poison: "bg-fuchsia-500/20",
  ground: "bg-amber-700/25",
  flying: "bg-indigo-400/20",
  psychic: "bg-pink-500/20",
  bug: "bg-lime-600/25",
  rock: "bg-stone-500/25",
  ghost: "bg-violet-700/25",
  dragon: "bg-indigo-700/25",
  dark: "bg-zinc-800/40",
  steel: "bg-slate-400/25",
  fairy: "bg-rose-400/25",
};

export function TypeIcon({ type, size = 28 }: { type: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const lowered = type.toLowerCase();
  const bg = TYPE_COLORS[lowered] ?? "bg-zinc-400/20";
  if (errored) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase rounded-full ${bg}`}
      >
        {type}
      </span>
    );
  }
  // PokeAPI type icons have varying native ratios (64×28, 70×28…). We fix
  // the height and let the width auto-derive. Using a plain <img> here
  // avoids Next's Image aspect-ratio warning (the component requires both
  // dimensions from the same source, which conflicts with our
  // height-only sizing). Images are tiny PNGs served from /public so the
  // Next optimiser would be a no-op anyway.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/textures/type/${lowered}.png`}
      alt={type}
      onError={() => setErrored(true)}
      className="inline-block max-w-full shrink w-auto"
      style={{ height: `${size}px` }}
      title={type}
    />
  );
}

export function TypePair({
  primary,
  secondary,
  size = 24,
}: {
  primary: string;
  secondary?: string | null;
  size?: number;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1 items-center max-w-full">
      <TypeIcon type={primary} size={size} />
      {secondary && <TypeIcon type={secondary} size={size} />}
    </span>
  );
}
