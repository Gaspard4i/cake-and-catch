import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listSpawnsForBiome } from "@/lib/db/queries";
import { BiomeSpawnList, type BiomeSpawnEntry } from "@/components/BiomeSpawnList";
import { PageSkeleton } from "@/components/Loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return { title: prettifyBiome(decodeURIComponent(key)) };
}

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
  const decoded = decodeURIComponent(key);
  const biomeKey = decoded.startsWith("#") ? decoded : `#${decoded}`;
  const primary = await listSpawnsForBiome(biomeKey);

  const rows = primary.length > 0 ? primary : await listSpawnsForBiome(decoded);
  if (rows.length === 0) notFound();

  const entries: BiomeSpawnEntry[] = rows.map((s) => ({
    spawnId: s.spawnId,
    speciesId: s.speciesId,
    slug: s.slug,
    name: s.name,
    dexNo: s.dexNo,
    primaryType: s.primaryType,
    secondaryType: s.secondaryType,
    bucket: s.bucket,
    weight: s.weight,
    levelMin: s.levelMin,
    levelMax: s.levelMax,
    sourceKind: s.sourceKind,
    sourceName: s.sourceName,
    sourceUrl: s.sourceUrl,
    condition: s.condition,
  }));

  return (
    <>
      <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
        ← Retour
      </Link>
      <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight capitalize">
        {prettifyBiome(decoded)}
      </h1>
      <p className="mt-1 text-sm text-muted font-mono">{decoded}</p>

      <BiomeSpawnList entries={entries} />
    </>
  );
}

export default function BiomePage({ params }: { params: Promise<{ key: string }> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <Suspense fallback={<PageSkeleton />}>
        <BiomeContent params={params} />
      </Suspense>
    </div>
  );
}
