import Link from "next/link";
import Image from "next/image";
import { listBerries, listAllSeasonings, listBaitEffects } from "@/lib/db/queries";
import { BAIT_VANILLA_ITEMS } from "@/lib/recommend/bait-effects";

export const metadata = {
  title: "Seasoning Dex — Snack & Catch",
  description:
    "All Cobblemon berries and bait seasonings: dominant flavour, colour, snack-eligibility, effects.",
};

const FLAVOUR_TINT: Record<string, string> = {
  SWEET: "#f8b3d7",
  SPICY: "#e85a3a",
  DRY: "#7fb3d5",
  BITTER: "#735a8a",
  SOUR: "#f4d35e",
};

function spriteUrl(slug: string, itemId: string, fruitTexture: string | null) {
  if (fruitTexture) return `/textures/cobblemon/item/berries/${slug}.png`;
  if (itemId.startsWith("minecraft:")) {
    const name = itemId.replace("minecraft:", "");
    const safe = name === "enchanted_golden_apple" ? "golden_apple" : name;
    return `/textures/minecraft/item/${safe}.png`;
  }
  const raw = itemId.replace(/^cobblemon:/, "");
  if (raw.endsWith("_berry")) return `/textures/cobblemon/item/berries/${raw}.png`;
  return `/textures/cobblemon/item/${raw}.png`;
}

export default async function SeasoningDexPage() {
  const [berries, seasonings, baits] = await Promise.all([
    listBerries(),
    listAllSeasonings(),
    listBaitEffects(),
  ]);

  const baitItemIds = new Set(baits.map((b) => b.itemId));

  // Berries first (the meat of the dex), then snack-valid vanilla, then the rest.
  type Row = {
    slug: string;
    itemId: string;
    name: string;
    kind: "berry" | "vanilla" | "other";
    snackValid: boolean;
    dominantFlavour: string | null;
    colour: string | null;
    effectTags: string[];
    spriteUrl: string;
    hasBaitEffects: boolean;
  };

  const rows: Row[] = [];
  for (const b of berries) {
    rows.push({
      slug: b.slug,
      itemId: b.itemId,
      name: b.slug.replace(/_/g, " "),
      kind: "berry",
      snackValid: true,
      dominantFlavour: b.dominantFlavour,
      colour: b.colour,
      effectTags: b.effectTags ?? [],
      spriteUrl: spriteUrl(b.slug, b.itemId, b.fruitTexture),
      hasBaitEffects: baitItemIds.has(b.itemId),
    });
  }
  const berrySlugs = new Set(berries.map((b) => b.slug));
  for (const s of seasonings) {
    if (berrySlugs.has(s.slug)) continue;
    const isSnackValid = BAIT_VANILLA_ITEMS.has(s.itemId);
    rows.push({
      slug: s.slug,
      itemId: s.itemId,
      name: s.slug.replace(/_/g, " "),
      kind: isSnackValid ? "vanilla" : "other",
      snackValid: isSnackValid,
      dominantFlavour: null,
      colour: s.colour,
      effectTags: [],
      spriteUrl: spriteUrl(s.slug, s.itemId, null),
      hasBaitEffects: baitItemIds.has(s.itemId),
    });
  }

  const berryRows = rows.filter((r) => r.kind === "berry");
  const vanillaRows = rows.filter((r) => r.kind === "vanilla");

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Seasoning Dex
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Every berry and bait seasoning known to Cobblemon. Click a card to
          see its 3D model, flavour profile, and what it attracts when used in
          a Poké Snack or Poké Bait.
        </p>
        <p className="text-[11px] text-muted mt-2">
          {berryRows.length} berries · {vanillaRows.length} vanilla bait items
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-muted mb-3">
          Berries ({berryRows.length})
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {berryRows.map((r) => (
            <SeasoningCard key={r.slug} row={r} />
          ))}
        </ul>
      </section>

      {vanillaRows.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted mb-3">
            Vanilla snack-valid bait ({vanillaRows.length})
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {vanillaRows.map((r) => (
              <SeasoningCard key={r.slug} row={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SeasoningCard({
  row,
}: {
  row: {
    slug: string;
    name: string;
    kind: "berry" | "vanilla" | "other";
    snackValid: boolean;
    dominantFlavour: string | null;
    colour: string | null;
    effectTags: string[];
    spriteUrl: string;
    hasBaitEffects: boolean;
  };
}) {
  const tint = row.dominantFlavour ? FLAVOUR_TINT[row.dominantFlavour] : null;
  return (
    <li>
      <Link
        href={row.kind === "berry" ? `/berry/${row.slug}` : `/seasonings/${row.slug}`}
        className="group flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 hover:border-accent transition-colors"
      >
        <div
          className="relative w-12 h-12 rounded-md flex items-center justify-center"
          style={{ background: tint ? `${tint}33` : undefined }}
        >
          <Image
            src={row.spriteUrl}
            alt={row.name}
            width={32}
            height={32}
            style={{ imageRendering: "pixelated" }}
            unoptimized
          />
        </div>
        <span className="text-xs font-medium capitalize text-center leading-tight group-hover:text-accent">
          {row.name}
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {row.dominantFlavour && (
            <span
              className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded text-stone-900"
              style={{ background: tint ?? "#bbb" }}
            >
              {row.dominantFlavour.toLowerCase()}
            </span>
          )}
          {row.hasBaitEffects && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-subtle text-muted">
              bait
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
