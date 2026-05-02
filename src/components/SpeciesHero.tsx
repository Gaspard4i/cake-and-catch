"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { PokemonSprite } from "./PokemonSprite";

/**
 * Header card on the species page. Shiny toggle is local — it
 * doesn't sync to the URL because the toggle is purely cosmetic and
 * we don't want it to compete with the dex query string for back-
 * button restoration.
 */
export function SpeciesHero({
  dexNo,
  name,
  baseSlug,
  variantLabel,
}: {
  dexNo: number;
  name: string;
  baseSlug: string;
  variantLabel: string | null;
}) {
  const [shiny, setShiny] = useState(false);
  return (
    <div className="relative flex items-center gap-4">
      <PokemonSprite
        dexNo={dexNo}
        name={name}
        baseSlug={baseSlug}
        variantLabel={variantLabel}
        size={120}
        shiny={shiny}
      />
      <button
        onClick={() => setShiny((v) => !v)}
        aria-pressed={shiny}
        title={shiny ? "Show regular sprite" : "Show shiny sprite"}
        className={`absolute top-0 left-24 inline-flex items-center justify-center size-7 rounded-full border transition-colors ${
          shiny
            ? "border-amber-400 bg-amber-400/15 text-amber-500"
            : "border-border bg-card text-muted hover:text-foreground"
        }`}
      >
        <Star
          className={`size-3.5 ${shiny ? "fill-amber-500 text-amber-500" : ""}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
