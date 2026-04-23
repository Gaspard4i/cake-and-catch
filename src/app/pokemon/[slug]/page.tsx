import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const species = await getSpeciesBySlug(slug);
  if (!species) return { title: "Cake & Catch" };
  const types = [species.primaryType, species.secondaryType].filter(Boolean).join(" / ");
  return {
    title: `${species.name} · Cake & Catch`,
    description: `#${String(species.dexNo).padStart(4, "0")} ${species.name} — ${types}. Spawns, recettes et appâts pour Cobblemon.`,
  };
}
import {
  getSourcesFor,
  getSpeciesBySlug,
  getWikiSummary,
  listBaitEffects,
  listSpawnsForSpecies,
} from "@/lib/db/queries";
import { SourceBadge } from "@/components/SourceBadge";
import { TypePair } from "@/components/TypeBadge";
import { BaitList } from "@/components/BaitList";
import { PokemonSprite } from "@/components/PokemonSprite";
import { topBaits } from "@/lib/recommend/bait";

function formatBiome(biome: string) {
  return biome.replace(/^#?cobblemon:/, "").replace(/is_/, "").replace(/_/g, " ");
}

function formatCondition(
  cond: unknown,
  t: (key: string, values?: Record<string, string | number>) => string,
): string[] {
  if (!cond || typeof cond !== "object") return [];
  const c = cond as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof c.timeRange === "string") parts.push(t("condition.time", { value: c.timeRange }));
  if (typeof c.moonPhase === "string") parts.push(t("condition.moon", { value: c.moonPhase }));
  if (c.isRaining === true) parts.push(t("condition.raining"));
  if (c.isThundering === true) parts.push(t("condition.thundering"));
  if (typeof c.minY === "number" || typeof c.maxY === "number") {
    parts.push(
      t("condition.y", {
        min: typeof c.minY === "number" ? c.minY : "-∞",
        max: typeof c.maxY === "number" ? c.maxY : "+∞",
      }),
    );
  }
  if (typeof c.minSkyLight === "number" || typeof c.maxSkyLight === "number") {
    parts.push(
      t("condition.skyLight", {
        min: typeof c.minSkyLight === "number" ? c.minSkyLight : 0,
        max: typeof c.maxSkyLight === "number" ? c.maxSkyLight : 15,
      }),
    );
  }
  if (Array.isArray(c.structures) && c.structures.length > 0) {
    parts.push(t("condition.structures", { value: (c.structures as string[]).join(", ") }));
  }
  if (Array.isArray(c.neededBaseBlocks) && c.neededBaseBlocks.length > 0) {
    parts.push(t("condition.blocks", { value: (c.neededBaseBlocks as string[]).join(", ") }));
  }
  return parts;
}

async function SpeciesDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const species = await getSpeciesBySlug(slug);
  if (!species) notFound();

  const [spawns, sources, baits, wiki, t] = await Promise.all([
    listSpawnsForSpecies(species.id),
    getSourcesFor("species", species.id),
    listBaitEffects(),
    getWikiSummary(species.id),
    getTranslations("pokemon"),
  ]);

  const primarySource = sources[0];
  const recommendedBaits = topBaits(baits, {
    primaryType: species.primaryType,
    preferredFlavours: species.preferredFlavours,
    limit: 6,
  });

  return (
    <>
      <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
        {t("back")}
      </Link>

      <header className="mt-4 flex items-center gap-4 flex-wrap">
        <PokemonSprite dexNo={species.dexNo} name={species.name} size={96} />
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-muted font-mono">
              #{String(species.dexNo).padStart(4, "0")}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">{species.name}</h1>
            <SourceBadge kind="mod" href={primarySource?.url} />
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-muted">
            <TypePair primary={species.primaryType} secondary={species.secondaryType} size={24} />
            <span>{t("captureRate", { value: species.catchRate })}</span>
            {species.baseFriendship != null && (
              <span>{t("friendship", { value: species.baseFriendship })}</span>
            )}
          </div>
        </div>
      </header>

      {wiki?.summary && (
        <section className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
              {t("notes")}
            </h2>
            <SourceBadge kind="wiki" href={wiki.pageUrl} />
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
            {wiki.summary.split("\n\n")[0]}
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">{t("stats")}</h2>
        <dl className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(species.baseStats).map(([k, v]) => {
            const value = v as number;
            const pct = Math.min(100, (value / 255) * 100);
            return (
              <div
                key={k}
                className="rounded-md border border-border bg-card px-3 py-2 relative overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-accent/15"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative">
                  <dt className="text-[10px] uppercase text-muted">{k.replace("_", " ")}</dt>
                  <dd className="font-mono text-lg">{value}</dd>
                </div>
              </div>
            );
          })}
        </dl>
        {species.abilities && species.abilities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="text-muted uppercase">Abilities:</span>
            {species.abilities.map((a, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full border capitalize ${
                  a.startsWith("h:")
                    ? "border-accent text-accent bg-accent/5"
                    : "border-border bg-subtle"
                }`}
                title={a.startsWith("h:") ? "Hidden ability" : "Ability"}
              >
                {a.replace(/^h:/, "").replaceAll("_", " ")}
              </span>
            ))}
          </div>
        )}
      </section>

      <BaitList baits={recommendedBaits} />

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          {t("spawnsCount", { count: spawns.length })}
        </h2>
        {spawns.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("noSpawn")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {spawns.map((s) => (
              <li key={s.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs rounded bg-subtle px-1.5 py-0.5 capitalize">
                      {s.bucket}
                    </span>
                    <span className="text-xs text-muted">
                      {t("levelRange", { min: s.levelMin, max: s.levelMax })} ·{" "}
                      {t("weight", { value: s.weight })}
                    </span>
                  </div>
                  <SourceBadge
                    kind={s.sourceKind === "addon" ? "addon" : "mod"}
                    label={
                      s.sourceKind === "addon"
                        ? `Addon · ${s.sourceName}`
                        : undefined
                    }
                    href={s.sourceUrl ?? undefined}
                  />
                </div>
                {s.biomes.length > 0 && (
                  <div className="mt-2 text-sm flex flex-wrap gap-x-2 gap-y-1 items-baseline">
                    <span className="text-muted">{t("biomes")}</span>
                    {s.biomes.map((b, i) => (
                      <Link
                        key={i}
                        href={`/biome/${encodeURIComponent(b.replace(/^#/, ""))}`}
                        className="underline decoration-dotted underline-offset-2 hover:text-accent capitalize"
                      >
                        {formatBiome(b)}
                      </Link>
                    ))}
                  </div>
                )}
                {formatCondition(s.condition, t as never).map((line, i) => (
                  <div key={i} className="text-xs text-muted mt-1">
                    {line}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Suspense fallback={<p className="text-sm text-muted">…</p>}>
        <SpeciesDetail params={params} />
      </Suspense>
    </div>
  );
}
