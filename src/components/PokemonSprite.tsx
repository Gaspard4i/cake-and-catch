"use client";

import { useMemo, useState } from "react";
import { spriteCandidates } from "@/lib/sprites/pokemon-sprite";

/**
 * Variant-aware Pokémon sprite. Cascades through Pokemon Showdown's
 * `dex` set (variant-aware) and PokeAPI's dex-number sprite as
 * fallback. When everything 404s we render a circular dex-number
 * badge so the layout never collapses to a broken-image icon.
 *
 * The sprite is a plain <img>, not next/image, because variant
 * sprites change frequently and Next's optimizer is overkill for
 * 60-pixel art assets — keeping it simple avoids the
 * `remotePatterns` config + the deopt of `unoptimized`.
 */
export function PokemonSprite({
  dexNo,
  name,
  baseSlug,
  variantLabel,
  size = 64,
  shiny = false,
  className = "",
}: {
  dexNo: number;
  name: string;
  /** Base species slug — used to build the Showdown URL. */
  baseSlug?: string | null;
  variantLabel?: string | null;
  size?: number;
  shiny?: boolean;
  className?: string;
}) {
  const candidates = useMemo(
    () => spriteCandidates({ dexNo, name, baseSlug, variantLabel, shiny }),
    [dexNo, name, baseSlug, variantLabel, shiny],
  );
  const [idx, setIdx] = useState(0);
  const exhausted = idx >= candidates.length;

  if (exhausted) {
    return (
      <span
        title={name}
        aria-label={name}
        className={`inline-flex items-center justify-center rounded-full bg-subtle border border-border font-mono text-[10px] text-muted shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {String(dexNo).padStart(4, "0")}
      </span>
    );
  }

  return (
    <img
      key={candidates[idx]}
      src={candidates[idx]}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setIdx((i) => i + 1)}
      className={`pixel inline-block object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
