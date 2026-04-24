import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { listBerries } from "@/lib/db/queries";
import { ItemIcon } from "@/components/ItemIcon";
import type { Apricorn, Flavour } from "@/lib/recommend/aprijuice";
import { cookAprijuice } from "@/lib/recommend/aprijuice";
import { RideStatsGrid } from "@/components/juice/RideStatsGrid";

/**
 * Cobblemon apricorn item ids keyed by the canonical colour name used
 * throughout the app. Used to render the exact block icon in the 3×3
 * crafting grid that mirrors the in-game Cooking Pot.
 */
const APRICORN_ITEM: Record<Apricorn, string> = {
  RED: "cobblemon:red_apricorn",
  YELLOW: "cobblemon:yellow_apricorn",
  GREEN: "cobblemon:green_apricorn",
  BLUE: "cobblemon:blue_apricorn",
  PINK: "cobblemon:pink_apricorn",
  BLACK: "cobblemon:black_apricorn",
  WHITE: "cobblemon:white_apricorn",
};

const APRICORN_JUICE_ITEM: Record<Apricorn, string> = {
  RED: "cobblemon:red_aprijuice",
  YELLOW: "cobblemon:yellow_aprijuice",
  GREEN: "cobblemon:green_aprijuice",
  BLUE: "cobblemon:blue_aprijuice",
  PINK: "cobblemon:pink_aprijuice",
  BLACK: "cobblemon:black_aprijuice",
  WHITE: "cobblemon:white_aprijuice",
};

const APRICORNS: Apricorn[] = [
  "RED",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PINK",
  "BLACK",
  "WHITE",
];

function parseApricorn(raw: string | undefined): Apricorn | null {
  if (!raw) return null;
  const up = raw.toUpperCase() as Apricorn;
  return APRICORNS.includes(up) ? up : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ apricorn?: string; berries?: string }>;
}): Promise<Metadata> {
  const p = await searchParams;
  const apricorn = parseApricorn(p.apricorn) ?? "RED";
  return { title: `${apricorn} Aprijuice recipe — Snack & Catch` };
}

export default async function JuiceRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ apricorn?: string; berries?: string }>;
}) {
  const p = await searchParams;
  const apricorn = parseApricorn(p.apricorn) ?? "RED";
  const slugs = (p.berries ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const [t, tc, allBerries] = await Promise.all([
    getTranslations("juice"),
    getTranslations("common"),
    listBerries(),
  ]);

  const bySlug = new Map(allBerries.map((b) => [b.slug, b]));
  const berries = slugs
    .map((s) => bySlug.get(s))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  const result = cookAprijuice({
    apricorn,
    berries: berries.map((b) => ({
      slug: b.slug,
      itemId: b.itemId,
      flavours: b.flavours as Partial<Record<Flavour, number>>,
    })),
  });

  // Shopping list: dedup ingredients with counts.
  const counts = new Map<string, { itemId: string; slug: string; count: number }>();
  for (const b of berries) {
    const prev = counts.get(b.slug);
    if (prev) prev.count += 1;
    else counts.set(b.slug, { itemId: b.itemId, slug: b.slug, count: 1 });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <Link
        href="/juice"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToJuice")}
      </Link>

      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted">
          {t("recipeStep")}
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("apricornHeading", { kind: apricorn })}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("recipeIntro")}</p>
      </header>

      {/* Crafting interface — 3x3 grid + arrow + result, mirroring the
          in-game Cooking Pot. */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">
          {t("craftingInterface")}
        </h2>
        <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
          {/* Ingredient grid: row 0 = apricorn + Pep-Up Flower + Energy Root. */}
          <div className="grid grid-cols-3 gap-1 p-2 rounded-lg bg-subtle border border-border">
            {[
              APRICORN_ITEM[apricorn],
              "cobblemon:pep_up_flower",
              "cobblemon:energy_root",
              null, null, null,
              null, null, null,
            ].map((id, i) => (
              <div
                key={i}
                className="size-12 sm:size-14 rounded bg-card border border-border flex items-center justify-center"
                title={id ?? ""}
              >
                {id && <ItemIcon id={id} size={36} />}
              </div>
            ))}
          </div>

          <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 text-muted" aria-hidden />

          {/* Result slot. */}
          <div
            className="size-14 sm:size-16 rounded bg-subtle border-2 border-accent/50 flex items-center justify-center"
            title={APRICORN_JUICE_ITEM[apricorn]}
          >
            <ItemIcon id={APRICORN_JUICE_ITEM[apricorn]} size={44} />
          </div>
        </div>

        {/* Seasoning slots (Cobblemon campfire pot exposes 3 side slots). */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wide text-muted text-center mb-2">
            {t("seasoningSlots")}
          </div>
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => {
              const b = berries[i];
              return (
                <div
                  key={i}
                  className={`size-12 sm:size-14 rounded-lg border-2 flex items-center justify-center ${
                    b
                      ? "border-accent bg-subtle"
                      : "border-dashed border-border bg-subtle/40"
                  }`}
                  title={b?.slug ?? ""}
                >
                  {b ? (
                    <ItemIcon id={b.itemId} size={36} />
                  ) : (
                    <span className="text-[9px] text-muted uppercase">
                      S{i + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step-by-step how-to. */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          {t("howto")}
        </h2>
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li>{t("howtoStep1")}</li>
          <li>
            {t("howtoStep2", {
              apricorn: t("apricornColour", { kind: apricorn }),
            })}
          </li>
          <li>{t("howtoStep3")}</li>
          <li>
            {berries.length > 0 ? (
              <>
                {t("howtoStep4")}{" "}
                {[...counts.values()].map((c, i, arr) => (
                  <span key={c.slug}>
                    <span className="inline-flex items-center gap-1 align-middle">
                      {c.count > 1 && (
                        <span className="font-mono text-xs">{c.count}×</span>
                      )}
                      <ItemIcon id={c.itemId} size={18} />
                      <span className="capitalize">
                        {c.slug.replaceAll("_", " ")}
                      </span>
                    </span>
                    {i < arr.length - 1 ? ", " : ""}
                  </span>
                ))}
              </>
            ) : (
              t("howtoStep4NoSeasoning")
            )}
          </li>
          <li>{t("howtoStep5")}</li>
        </ol>
      </section>

      {/* Ride stat result. */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">
          {t("rideBoosts")}
        </h2>
        <RideStatsGrid stats={result.statBoosts} />
        {result.summary.length === 0 && (
          <p className="mt-3 text-sm text-muted">{t("noNetBoost")}</p>
        )}
      </section>
    </div>
  );
}
