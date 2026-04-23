"use client";

import Image from "next/image";
import { useState } from "react";

function resolvePath(id: string): { src: string; alt: string } | null {
  if (!id) return null;
  const [ns, raw] = id.includes(":") ? id.split(":", 2) : ["minecraft", id];
  const name = raw.replaceAll("_", "_");
  if (ns === "minecraft") {
    return { src: `/textures/minecraft/item/${name}.png`, alt: raw };
  }
  if (ns === "cobblemon") {
    if (/_berry$/.test(name)) return { src: `/textures/cobblemon/item/berries/${name}.png`, alt: raw };
    if (name === "poke_snack") return { src: `/textures/cobblemon/item/food/poke_snack.png`, alt: raw };
    return { src: `/textures/cobblemon/item/${name}.png`, alt: raw };
  }
  if (ns === "c") {
    // Tag reference (e.g. c:drinks/milk) — no direct texture, caller renders a placeholder
    return null;
  }
  return null;
}

export function ItemIcon({
  id,
  size = 32,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const resolved = resolvePath(id);
  if (!resolved || errored) {
    const label = id.split(":").pop()?.replaceAll("_", " ") ?? "?";
    return (
      <span
        title={id}
        className={`inline-flex items-center justify-center rounded bg-subtle border border-border text-[8px] text-muted text-center leading-tight p-1 ${className}`}
        style={{ width: size, height: size }}
      >
        {label.slice(0, 10)}
      </span>
    );
  }
  return (
    <Image
      src={resolved.src}
      alt={resolved.alt}
      width={size}
      height={size}
      unoptimized
      onError={() => setErrored(true)}
      className={`pixel inline-block ${className}`}
      title={id}
    />
  );
}
