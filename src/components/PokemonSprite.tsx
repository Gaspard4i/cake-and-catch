"use client";

import Image from "next/image";
import { useState } from "react";

export function PokemonSprite({
  dexNo,
  name,
  size = 64,
  variant = "default",
  className = "",
}: {
  dexNo: number;
  name: string;
  size?: number;
  variant?: "default" | "artwork";
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const src =
    variant === "artwork"
      ? `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${dexNo}.png`
      : `/textures/pokemon/${dexNo}.png`;
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
      unoptimized={variant === "default"}
      onError={() => setErrored(true)}
      className={`pixel inline-block ${className}`}
    />
  );
}
