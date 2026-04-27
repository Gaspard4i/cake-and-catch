import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listSourceNames, searchSpeciesFiltered } from "@/lib/db/queries";
import { SearchBar } from "@/components/SearchBar";
import { TypePair } from "@/components/TypeBadge";
import { PokemonSprite } from "@/components/PokemonSprite";
import { Skeleton } from "@/components/Loader";

const TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

const BUCKETS = ["common", "uncommon", "rare", "ultra-rare"];

function FilterLink({
  current,
  value,
  field,
  label,
  params,
}: {
  current: string | undefined;
  value: string;
  field: string;
  label: string;
  params: Record<string, string | undefined>;
}) {
  const next: Record<string, string | undefined> = { ...params };
  next[field] = current === value ? undefined : value;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
  const href = `/search${qs.toString() ? `?${qs.toString()}` : ""}`;
  const active = current === value;
  return (
    <Link
      href={href}
      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
        active
          ? "bg-accent text-accent-foreground border-accent"
          : "border-border bg-card text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

async function ResultsAsync({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; bucket?: string; source?: string }>;
}) {
  const params = await searchParams;
  const [rows, sources, t] = await Promise.all([
    searchSpeciesFiltered(params, 100),
    listSourceNames(),
    getTranslations("search"),
  ]);

  return (
    <>
      <div className="mt-4">
        <SearchBar defaultValue={params.q ?? ""} autoFocus />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-muted w-16">Type</span>
          {TYPES.map((type) => (
            <FilterLink
              key={type}
              current={params.type}
              value={type}
              field="type"
              label={type}
              params={params}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-muted w-16">Bucket</span>
          {BUCKETS.map((b) => (
            <FilterLink
              key={b}
              current={params.bucket}
              value={b}
              field="bucket"
              label={b}
              params={params}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-muted w-16">Source</span>
          {sources.map((s) => (
            <FilterLink
              key={s}
              current={params.source}
              value={s}
              field="source"
              label={s}
              params={params}
            />
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{t("noResults", { q: params.q ?? "" })}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/pokemon/${s.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-subtle transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <PokemonSprite dexNo={s.dexNo} name={s.name} size={40} />
                  <span className="font-mono text-xs text-muted shrink-0">
                    #{String(s.dexNo).padStart(4, "0")}
                  </span>
                  <span className="truncate">{s.name}</span>
                </span>
                <TypePair primary={s.primaryType} secondary={s.secondaryType} size={20} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function SearchHeader() {
  const t = await getTranslations("search");
  return <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>;
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; bucket?: string; source?: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
      <Suspense fallback={<div className="h-8" />}>
        <SearchHeader />
      </Suspense>
      <Suspense
        fallback={
          <div className="mt-4 space-y-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        }
      >
        <ResultsAsync searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
