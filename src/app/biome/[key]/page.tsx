import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listSpawnsForBiome } from "@/lib/db/queries";
import { TypePair } from "@/components/TypeBadge";
import { SourceBadge } from "@/components/SourceBadge";

function prettifyBiome(key: string): string {
  return key
    .replace(/^#?/, "")
    .replace(/^cobblemon:/, "")
    .replace(/^minecraft:/, "")
    .replace(/^is_/, "")
    .replaceAll("_", " ");
}

async function BiomeContent({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  // The URL-safe form strips leading '#' and uses ':'. We accept both encodings.
  const decoded = decodeURIComponent(key);
  const biomeKey = decoded.startsWith("#") ? decoded : `#${decoded}`;
  const spawns = await listSpawnsForBiome(biomeKey);

  // Fallback: also try without '#' for non-tag biomes (e.g. "minecraft:plains")
  const finalSpawns =
    spawns.length > 0 ? spawns : await listSpawnsForBiome(decoded);

  if (finalSpawns.length === 0) notFound();

  const t = await getTranslations("biome");

  return (
    <>
      <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
        ← Retour
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight capitalize">
        {prettifyBiome(decoded)}
      </h1>
      <p className="mt-1 text-sm text-muted font-mono">{decoded}</p>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-muted">
        {t("spawnsHere", { count: finalSpawns.length })}
      </h2>
      <ul className="mt-3 space-y-2">
        {finalSpawns.map((s) => (
          <li
            key={s.spawnId}
            className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <Link
              href={`/pokemon/${s.slug}`}
              className="flex items-center gap-3 min-w-0 hover:text-accent transition-colors"
            >
              <span className="font-mono text-xs text-muted shrink-0">
                #{String(s.dexNo).padStart(4, "0")}
              </span>
              <span className="truncate font-medium">{s.name}</span>
              <TypePair primary={s.primaryType} secondary={s.secondaryType} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs rounded bg-subtle px-1.5 py-0.5 capitalize">
                {s.bucket}
              </span>
              <span className="text-xs text-muted">
                Niv. {s.levelMin}–{s.levelMax}
              </span>
              <SourceBadge
                kind={s.sourceKind === "addon" ? "addon" : "mod"}
                label={s.sourceKind === "addon" ? `Addon · ${s.sourceName}` : undefined}
                href={s.sourceUrl ?? undefined}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function BiomePage({ params }: { params: Promise<{ key: string }> }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Suspense fallback={<p className="text-sm text-muted">…</p>}>
        <BiomeContent params={params} />
      </Suspense>
    </div>
  );
}
