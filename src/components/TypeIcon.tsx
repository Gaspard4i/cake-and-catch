"use client";

import Image from "next/image";
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
  // PokeAPI type icons aren't 2.5:1 exactly (some are 64x28, others 70x28),
  // so we set explicit pixel height and let the image keep its native ratio.
  return (
    <Image
      src={`/textures/type/${lowered}.png`}
      alt={type}
      width={size * 2.5}
      height={size}
      unoptimized
      onError={() => setErrored(true)}
      className="inline-block"
      style={{ height: size, width: "auto" }}
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
    <span className="inline-flex gap-1 items-center">
      <TypeIcon type={primary} size={size} />
      {secondary && <TypeIcon type={secondary} size={size} />}
    </span>
  );
}
