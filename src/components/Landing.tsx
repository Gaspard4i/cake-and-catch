"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { BerryPlacement } from "./Snack3D";
import { HomeSearch } from "./HomeSearch";
import { SiteStatsBadge } from "./SiteStatsBadge";

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
 * Initial state is empty so SSR and the first client render produce the
 * same markup; the first roll lands in useEffect, after hydration.
 */
function useRandomSnack(pool: Seasoning[]): Seasoning[] {
  const [roll, setRoll] = useState<Seasoning[]>([]);
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

  // Background Cobblemon floaters are generated client-side only. Using
  // Math.random() during render would produce different values on SSR vs
  // hydration, causing a hydration mismatch. We defer to useEffect so
  // both SSR and the first client render produce an empty set.
  const [floaters, setFloaters] = useState<
    Array<{ dex: number; size: number; left: number; top: number; delay: number; duration: number }>
  >([]);
  useEffect(() => {
    setFloaters(
      Array.from({ length: 14 }, () => ({
        dex: Math.floor(Math.random() * 1025) + 1,
        size: 40 + Math.random() * 80,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 15 + Math.random() * 20,
      })),
    );
  }, []);

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

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-20 pb-16 sm:pb-24 flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
        <div className="flex-1 w-full min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            <span>Cobblemon companion</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Cook the right snack.
            <br />
            <span className="text-accent">Catch the right Cobblemon.</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted max-w-xl">
            {labels.tagline}
          </p>
          <p className="mt-2 text-xs sm:text-sm text-muted">
            <span className="text-foreground font-medium">{labels.indexedSpecies}</span>
          </p>

          <div className="mt-3">
            <SiteStatsBadge />
          </div>

          {/* On mobile, show the 3D snack between the intro and the search so
              the main CTA (search + buttons) stays near the fold. */}
          <div className="md:hidden mt-6 flex flex-col items-center gap-2">
            <ResponsiveSnack3D berries={berries} mobile />
            <div className="text-[10px] uppercase tracking-widest text-muted text-center max-w-[280px]">
              {berries.length === 0
                ? "no seasoning"
                : berries.map((b) => b.slug.replaceAll("_", " ")).join(" · ")}
            </div>
          </div>

          <div className="mt-6 md:mt-8">
            <HomeSearch />
          </div>

          <div className="mt-4 sm:mt-6 flex flex-wrap gap-3">
            <Link
              href="/pokedex"
              className="flex-1 sm:flex-none text-center rounded-lg bg-accent text-accent-foreground px-5 py-3 sm:py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Open the Cobbledex →
            </Link>
            <Link
              href="/snack"
              className="relative flex-1 sm:flex-none text-center rounded-lg border border-border bg-card px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-subtle transition"
            >
              Snack maker
              <RandomBerryBadge pool={pool} />
            </Link>
            <Link
              href="/juice"
              className="relative flex-1 sm:flex-none text-center rounded-lg border border-border bg-card px-5 py-3 sm:py-2.5 text-sm font-medium hover:bg-subtle transition"
            >
              Aprijuice maker
              <RandomApricornBadge />
            </Link>
          </div>
        </div>

        <div className="hidden md:flex shrink-0 flex-col items-center gap-3">
          <ResponsiveSnack3D berries={berries} />
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

/**
 * Adaptive Snack3D wrapper: picks a canvas size based on the viewport so the
 * hero model stays readable on small screens (phones get ~min(viewport-2rem,
 * 280px); tablets+ get 460px). Size is measured client-side after mount.
 */
function ResponsiveSnack3D({
  berries,
  mobile = false,
}: {
  berries: Seasoning[];
  mobile?: boolean;
}) {
  const [size, setSize] = useState(mobile ? 240 : 460);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (mobile) {
        // Cap at 280px, leave 32px of padding around the canvas.
        setSize(Math.min(Math.max(w - 32, 200), 280));
      } else {
        setSize(w < 1100 ? 320 : 460);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mobile]);
  return <Snack3D berries={berries} size={size} interactive />;
}

const APRICORN_COLOURS = [
  "red",
  "yellow",
  "green",
  "blue",
  "pink",
  "black",
  "white",
] as const;

/**
 * Same idea as RandomBerryBadge, but for the Aprijuice maker CTA — picks
 * a random apricorn colour on mount.
 */
function RandomApricornBadge() {
  const [colour, setColour] = useState<string | null>(null);
  useEffect(() => {
    const c = APRICORN_COLOURS[Math.floor(Math.random() * APRICORN_COLOURS.length)];
    setColour(c);
  }, []);
  if (!colour) return null;
  return (
    <Image
      aria-hidden
      src={`/textures/cobblemon/item/${colour}_apricorn.png`}
      alt=""
      width={26}
      height={26}
      className="pointer-events-none absolute -top-2 -right-2"
      style={{ imageRendering: "pixelated" }}
      unoptimized
    />
  );
}

/**
 * Decorative 2D sprite floating on the top-right corner of the Snack
 * maker CTA. Picks a random berry from the loaded pool on mount so the
 * landing feels different on each visit. Pointer-events disabled so it
 * never blocks the underlying button click.
 */
function RandomBerryBadge({ pool }: { pool: Seasoning[] }) {
  const [pick, setPick] = useState<Seasoning | null>(null);
  useEffect(() => {
    if (pool.length === 0) return;
    setPick(pool[Math.floor(Math.random() * pool.length)]);
  }, [pool]);
  if (!pick) return null;
  return (
    <Image
      aria-hidden
      src={`/textures/cobblemon/item/berries/${pick.slug}.png`}
      alt=""
      width={26}
      height={26}
      className="pointer-events-none absolute -top-2 -right-2"
      style={{ imageRendering: "pixelated" }}
      unoptimized
    />
  );
}
