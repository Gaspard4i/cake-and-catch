import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { countSpecies, searchSpecies } from "@/lib/db/queries";
import { SearchBar } from "@/components/SearchBar";
import { TypePair } from "@/components/TypeBadge";

async function HomeContent() {
  const [t, tHome, total, sample] = await Promise.all([
    getTranslations("app"),
    getTranslations("home"),
    countSpecies(),
    searchSpecies("", 12),
  ]);

  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Cake <span className="text-accent">&amp;</span> Catch
        </h1>
        <p className="mt-2 text-muted">
          {t("tagline")}{" "}
          <span className="text-foreground font-medium">
            {t("indexedSpecies", { count: total })}
          </span>
        </p>
      </div>

      <div className="mt-6 max-w-2xl">
        <SearchBar />
      </div>

      <section className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          {tHome("pokedexPreview")}
        </h2>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sample.map((s) => (
            <li key={s.id}>
              <Link
                href={`/pokemon/${s.slug}`}
                className="block rounded-lg border border-border bg-card p-4 hover:bg-subtle hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs text-muted font-mono">
                    #{String(s.dexNo).padStart(4, "0")}
                  </span>
                </div>
                <div className="font-medium mt-1">{s.name}</div>
                <div className="mt-2">
                  <TypePair primary={s.primaryType} secondary={s.secondaryType} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Suspense fallback={<div className="text-muted text-sm">…</div>}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
