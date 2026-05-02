"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Single sprite source for every Pokémon — the PokeAPI default front
 * sprite keyed on the National Dex number. Base species and variants
 * (alolan, galarian, mega, gmax, …) all reuse the base dex sprite, so
 * the visual style stays consistent across the app.
 */
export function PokemonSprite({
  dexNo,
  name,
  size = 64,
  shiny = false,
  className = "",
}: {
  dexNo: number;
  name: string;
  size?: number;
  /** Kept for API compatibility — rendering is identical for every form. */
  variant?: "default" | "artwork";
  shiny?: boolean;
  /** Kept for API compatibility — see comment above. */
  variantLabel?: string | null;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const src = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${shiny ? "shiny/" : ""}${dexNo}.png`;
  if (errored) {
    return (
      <span
        title={name}
        className={`inline-flex items-center justify-center rounded-full bg-subtle border border-border font-mono text-[10px] text-muted ${className}`}
        style={{ width: size, height: size }}
      >
        {String(dexNo).padStart(4, "0")}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      onError={() => setErrored(true)}
      className={`pixel inline-block ${className}`}
    />
  );
}
