"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { BerryPlacement } from "./Snack3D";

const Snack3D = dynamic(() => import("./Snack3D").then((m) => m.Snack3D), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-border bg-subtle size-[280px]" />,
});

type Labels = {
  tagline: string;
  indexedSpecies: string;
  ctaPokedex: string;
  ctaCake: string;
  ctaRecipes: string;
  recentlyIndexed: string;
};

type PreviewMon = {
  dexNo: number;
  name: string;
  slug: string;
  primaryType: string;
  secondaryType: string | null;
};

type SeasoningDTO = BerryPlacement & {
  kind: "berry" | "other";
  cakeValid: boolean;
};

export function Landing({
  labels,
  total,
  preview,
}: {
  labels: Labels;
  total: number;
  preview: PreviewMon[];
}) {
  const [berry, setBerry] = useState<BerryPlacement | null>(null);

  // Fetch all berries on mount, cycle a random one every few seconds.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    fetch("/api/snack")
      .then((r) => r.json())
      .then((data: { berries?: SeasoningDTO[] }) => {
        if (cancelled) return;
        const berries = data.berries ?? [];
        if (berries.length === 0) return;
        const pick = () => berries[Math.floor(Math.random() * berries.length)];
        setBerry(pick());
        timer = setInterval(() => setBerry(pick()), 4000);
      })
      .catch(() => {
        /* API unavailable during prod-without-DB; Snack3D falls back to plain colour */
      });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  // Floating dex numbers for a parallax Pokéball-like backdrop.
  const floaters = useMemo(
    () =>
      Array.from({ length: 14 }, () => {
        const dex = Math.floor(Math.random() * 1025) + 1;
        const size = 40 + Math.random() * 80;
        return {
          dex,
          size,
          left: Math.random() * 100,
          top: Math.random() * 100,
          delay: Math.random() * 10,
          duration: 15 + Math.random() * 20,
        };
      }),
    [],
  );

  const snackBerries: BerryPlacement[] = berry ? [berry] : [];
  const prettyBerry = berry?.slug?.replaceAll("_", " ") ?? "snack";

  return (
    <div className="relative overflow-hidden">
      {/* Animated backdrop */}
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

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 flex flex-col-reverse md:flex-row items-center gap-10">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            <span>Cobblemon companion</span>
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
            Cook the right snack.
            <br />
            <span className="text-accent">Catch the right Pokémon.</span>
          </h1>
          <p className="mt-4 text-muted max-w-lg">{labels.tagline}</p>
          <p className="mt-2 text-sm text-muted">
            <span className="text-foreground font-medium">{labels.indexedSpecies}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pokedex"
              className="rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              {labels.ctaPokedex} →
            </Link>
            <Link
              href="/snack"
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-subtle transition"
            >
              {labels.ctaCake}
            </Link>
            <Link
              href="/recipes"
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-subtle transition"
            >
              {labels.ctaRecipes}
            </Link>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center">
          <Snack3D berries={snackBerries} size={280} />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted text-center">
            {berry ? `with ${prettyBerry}` : "no seasoning"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          {labels.recentlyIndexed}
        </h2>
        <ul className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {preview.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/pokemon/${p.slug}`}
                className="group block rounded-lg border border-border bg-card p-2 hover:border-accent/50 transition"
              >
                <img
                  src={`/textures/pokemon/${p.dexNo}.png`}
                  alt={p.name}
                  className="pixel mx-auto size-14 group-hover:scale-110 transition"
                />
                <div className="mt-1 text-center text-[10px] truncate">{p.name}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
