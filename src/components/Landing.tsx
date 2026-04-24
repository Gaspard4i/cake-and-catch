"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { BerryPlacement } from "./Snack3D";
import { HomeSearch } from "./HomeSearch";

const Snack3D = dynamic(() => import("./Snack3D").then((m) => m.Snack3D), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-border bg-subtle size-[180px]" />,
});

type Labels = {
  tagline: string;
  indexedSpecies: string;
};

type Seasoning = BerryPlacement & {
  snackValid?: boolean;
  fruitModel?: string | null;
  fruitTexture?: string | null;
  snackPositionings?: BerryPlacement["snackPositionings"];
};

const FALLBACK_BERRIES: Seasoning[] = [
  { slug: "oran_berry", itemId: "cobblemon:oran_berry", colour: "light_blue",
    flavours: { SOUR: 10 }, dominantFlavour: "SOUR" },
  { slug: "cheri_berry", itemId: "cobblemon:cheri_berry", colour: "red",
    flavours: { SPICY: 10 }, dominantFlavour: "SPICY" },
  { slug: "pecha_berry", itemId: "cobblemon:pecha_berry", colour: "pink",
    flavours: { SWEET: 10 }, dominantFlavour: "SWEET" },
  { slug: "chesto_berry", itemId: "cobblemon:chesto_berry", colour: "purple",
    flavours: { DRY: 10 }, dominantFlavour: "DRY" },
  { slug: "rawst_berry", itemId: "cobblemon:rawst_berry", colour: "green",
    flavours: { BITTER: 10 }, dominantFlavour: "BITTER" },
  { slug: "starf_berry", itemId: "cobblemon:starf_berry", colour: "orange",
    flavours: { SPICY: 10, DRY: 10, SWEET: 10, BITTER: 10, SOUR: 10 },
    dominantFlavour: "SPICY" },
];

function randomBerries(pool: Seasoning[]): Seasoning[] {
  const count = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

/**
 * Single hero snack: rolls a fresh composition of 1-3 berries every 4.5s.
 */
function useRandomSnack(pool: Seasoning[]): Seasoning[] {
  const [roll, setRoll] = useState<Seasoning[]>(() => randomBerries(pool));
  useEffect(() => {
    if (pool.length === 0) return;
    setRoll(randomBerries(pool));
    const id = setInterval(() => setRoll(randomBerries(pool)), 4500);
    return () => clearInterval(id);
  }, [pool]);
  return roll;
}

export function Landing({ labels }: { labels: Labels }) {
  const [pool, setPool] = useState<Seasoning[]>(FALLBACK_BERRIES);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/snack")
      .then((r) => r.json())
      .then((data: { berries?: Seasoning[] }) => {
        if (cancelled) return;
        const arr = (data.berries ?? []).filter(
          (b) => b.fruitModel && b.snackPositionings && b.snackPositionings.length > 0,
        );
        if (arr.length > 0) setPool(arr);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const berries = useRandomSnack(pool);

  const floaters = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        dex: Math.floor(Math.random() * 1025) + 1,
        size: 40 + Math.random() * 80,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 15 + Math.random() * 20,
      })),
    [],
  );

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-subtle" />
        <svg className="absolute inset-0 size-full opacity-[0.04]" aria-hidden>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {floaters.map((f, i) => (
          <img
            key={i}
            src={`/textures/pokemon/${f.dex}.png`}
            alt=""
            aria-hidden
            loading="lazy"
            className="pixel absolute opacity-20 dark:opacity-15 animate-floaty"
            style={{
              width: f.size,
              height: f.size,
              left: `${f.left}%`,
              top: `${f.top}%`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
            }}
          />
        ))}
      </div>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 flex flex-col-reverse md:flex-row items-start gap-10">
        <div className="flex-1 w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            <span>Cobblemon companion</span>
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
            Cook the right snack.
            <br />
            <span className="text-accent">Catch the right Pokémon.</span>
          </h1>
          <p className="mt-4 text-muted max-w-xl">{labels.tagline}</p>
          <p className="mt-2 text-sm text-muted">
            <span className="text-foreground font-medium">{labels.indexedSpecies}</span>
          </p>

          <div className="mt-8">
            <HomeSearch />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pokedex"
              className="rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Open the Pokédex →
            </Link>
            <Link
              href="/snack"
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-subtle transition"
            >
              Snack maker
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-10 flex items-end gap-4 select-none pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://starlightskins.lunareclipse.studio/render/walking/Gaz4i/full"
                alt="Gaz4i"
                className="h-48 w-auto drop-shadow-sm"
                style={{ imageRendering: "pixelated" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/285.png"
                alt="Shroomish"
                className="h-24 w-auto drop-shadow-sm"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-center gap-3">
          <Snack3D berries={berries} size={460} />
          <div className="text-xs uppercase tracking-widest text-muted text-center max-w-[460px]">
            {berries.length === 0
              ? "no seasoning"
              : berries.map((b) => b.slug.replaceAll("_", " ")).join(" · ")}
          </div>
        </div>
      </section>
    </div>
  );
}
