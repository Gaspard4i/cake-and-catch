import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
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

/**
 * Aprijuice visual quality tier. Per the wiki:
 *   <4 boost points → Plain
 *   4-7             → Tasty
 *   8+              → Delicious
 * Sprites live in /textures/aprijuice/<tier>_<colour>_aprijuice.png.
 */
function juiceTier(totalPositive: number): "plain" | "tasty" | "delicious" {
  if (totalPositive >= 8) return "delicious";
  if (totalPositive >= 4) return "tasty";
  return "plain";
}
function aprijuiceSpriteSrc(apricorn: Apricorn, tier: "plain" | "tasty" | "delicious"): string {
  return `/textures/aprijuice/${tier}_${apricorn.toLowerCase()}_aprijuice.png`;
}

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

  // Quality tier (Plain / Tasty / Delicious) = sum of positive stat
  // boosts from the produced juice.
  const totalPositive = (Object.values(result.statBoosts) as number[]).reduce(
    (s, v) => s + (v > 0 ? v : 0),
    0,
  );
  const tier = juiceTier(totalPositive);
  const juiceSprite = aprijuiceSpriteSrc(apricorn, tier);

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

      {/* Cobblemon cooking-pot interface — 1:1 copy of the wiki layout.
          The GIF at /textures/ui/cooking_interface.gif draws every slot
          border; our job is to overlay the right items in the right
          positions using the same .interface .cooking-interface classes
          as the wiki. */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">
          {t("craftingInterface")}
        </h2>
        <div className="flex justify-center">
          <CookingInterface
            apricornItem={APRICORN_ITEM[apricorn]}
            berries={berries}
            juiceSprite={juiceSprite}
            tier={tier}
          />
        </div>

        {/* Tier label below the panel so the user knows what quality
            comes out of this recipe. */}
        <div className="mt-3 text-center text-xs">
          <span className="text-muted">{t("qualityLabel")}: </span>
          <span
            className={`font-mono uppercase tracking-wide ${
              tier === "delicious"
                ? "text-amber-600 dark:text-amber-400"
                : tier === "tasty"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted"
            }`}
          >
            {tier}
          </span>
          <span className="text-muted"> · {totalPositive} pts</span>
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

/**
 * Overlay of item icons on top of the cooking-interface GIF background.
 *
 * Coordinate system is the outer panel (the `.interface.cooking-interface`
 * box), top-left = (0,0). Measurements relative to the Cobblemon wiki GIF:
 *   - Panel: 320×146, border 2, padding 8 → content box starts at (10,10)
 *   - GIF rendered at background-position 14,14 inside padding box →
 *     GIF top-left at panel coord (10+14, 10+14) = (24, 24)
 *   - Each slot in the GIF is 18×18, with a 1 px inner padding, so a
 *     16×16 icon sits at slot-corner + (1, 1)
 *   - Left 3×3 grid starts at GIF (4, 4) → panel (28, 28) stride 18
 *   - Seasoning column: 3 slots stacked at GIF (x, 4), (x, 22), (x, 40)
 *     where x ≈ 148 → panel 172
 *   - Result slot (aprijuice): GIF (x, 22) where x ≈ 216 → panel 240
 */
type BerryRow = { slug: string; itemId: string };

function CookingInterface({
  apricornItem,
  berries,
  juiceSprite,
  tier,
}: {
  apricornItem: string;
  berries: BerryRow[];
  juiceSprite: string;
  tier: "plain" | "tasty" | "delicious";
}) {
  // Left 3×3 grid: only the top row is used by the aprijuice recipe.
  const gridX = 28;
  const gridY = 28;
  // Seasoning column (3 vertical slots).
  const seasoningX = 172;
  const seasoningY = 28;
  // Result slot (finished aprijuice).
  const resultX = 240;
  const resultY = 46;

  return (
    <div className="interface cooking-interface">
      {/* Left 3×3 grid, top row populated. */}
      <div
        className="cooking-slot"
        style={{ left: gridX, top: gridY }}
        title={apricornItem}
      >
        <ItemIcon id={apricornItem} size={16} />
      </div>
      <div
        className="cooking-slot"
        style={{ left: gridX + 18, top: gridY }}
        title="cobblemon:pep_up_flower"
      >
        <ItemIcon id="cobblemon:pep_up_flower" size={16} />
      </div>
      <div
        className="cooking-slot"
        style={{ left: gridX + 36, top: gridY }}
        title="cobblemon:energy_root"
      >
        <ItemIcon id="cobblemon:energy_root" size={16} />
      </div>

      {/* Seasoning column. */}
      {Array.from({ length: 3 }).map((_, i) => {
        const b = berries[i];
        return (
          <div
            key={i}
            className="cooking-slot"
            style={{ left: seasoningX, top: seasoningY + i * 18 }}
            title={b?.slug ?? ""}
          >
            {b && <ItemIcon id={b.itemId} size={16} />}
          </div>
        );
      })}

      {/* Result slot. */}
      <div
        className="cooking-slot"
        style={{ left: resultX, top: resultY }}
        title={`${tier} aprijuice`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={juiceSprite} alt={`${tier} aprijuice`} />
      </div>
    </div>
  );
}

