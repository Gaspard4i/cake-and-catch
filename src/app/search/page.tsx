import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { searchSpecies } from "@/lib/db/queries";
import { SearchBar } from "@/components/SearchBar";
import { TypePair } from "@/components/TypeBadge";

async function ResultsAsync({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [rows, t] = await Promise.all([searchSpecies(q, 50), getTranslations("search")]);
  return (
    <>
      <div className="mt-4">
        <SearchBar defaultValue={q} autoFocus />
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{t("noResults", { q })}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/pokemon/${s.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-subtle transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-muted shrink-0">
                    #{String(s.dexNo).padStart(4, "0")}
                  </span>
                  <span className="truncate">{s.name}</span>
                </span>
                <TypePair primary={s.primaryType} secondary={s.secondaryType} />
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
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Suspense fallback={<div className="h-8" />}>
        <SearchHeader />
      </Suspense>
      <Suspense fallback={<p className="mt-4 text-sm text-muted">…</p>}>
        <ResultsAsync searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
