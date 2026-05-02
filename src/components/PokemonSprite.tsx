"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Build the pokemondb slug for a Pokémon. Every species (base or
 * variant) is reachable by `<basename>` or `<basename>-<variant>`:
 *   bulbasaur, vulpix-alolan, slowpoke-galarian, tauros-paldea-combat,
 *   venusaur-mega, charizard-gmax.
 * pokemondb uses `paldea` instead of `paldean`, normalise.
 */
function pokemondbSlug(name: string, variantLabel?: string | null): string {
  const base = name
    .toLowerCase()
    .replace(/\s*\(.*\)\s*$/, "") // drop "(alolan)" suffix we add at ingest
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!variantLabel) return base;
  const v = variantLabel.toLowerCase().replace(/^paldean/, "paldea");
  return `${base}-${v}`;
}

export function PokemonSprite({
  dexNo,
  name,
  size = 64,
  variant = "default",
  shiny = false,
  variantLabel,
  className = "",
}: {
  dexNo: number;
  name: string;
  size?: number;
  variant?: "default" | "artwork";
  shiny?: boolean;
  /** Regional / form aspect (e.g. "alolan", "mega", "gmax", "paldean-combat"). */
  variantLabel?: string | null;
  className?: string;
}) {
  // Cascade through fallbacks when a sprite 404s: pokemondb 2D ↘
  // pokemondb HOME (3D but covers everything) ↘ PokeAPI by dex ↘
  // baked-in dex number badge.
  void variant;
  const slug = pokemondbSlug(name, variantLabel);
  const candidates = [
    `https://img.pokemondb.net/sprites/sword-shield/${shiny ? "shiny" : "normal"}/${slug}.png`,
    `https://img.pokemondb.net/sprites/home/${shiny ? "shiny" : "normal"}/${slug}.png`,
    `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${shiny ? "shiny/" : ""}${dexNo}.png`,
  ];
  const [srcIndex, setSrcIndex] = useState(0);
  const errored = srcIndex >= candidates.length;
  const src = errored ? candidates[0] : candidates[srcIndex];
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
      onError={() => setSrcIndex((i) => i + 1)}
      className={`pixel inline-block ${className}`}
    />
  );
}
