import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { countSpecies, searchSpecies } from "@/lib/db/queries";
import { Landing } from "@/components/Landing";

async function LandingShell() {
  const [t, tHome, total, preview] = await Promise.all([
    getTranslations("app"),
    getTranslations("home"),
    countSpecies(),
    searchSpecies("", 24),
  ]);
  return (
    <Landing
      total={total}
      preview={preview.map((p) => ({
        dexNo: p.dexNo,
        name: p.name,
        slug: p.slug,
        primaryType: p.primaryType,
        secondaryType: p.secondaryType,
      }))}
      labels={{
        tagline: t("tagline"),
        indexedSpecies: t("indexedSpecies", { count: total }),
        ctaPokedex: tHome("ctaPokedex"),
        ctaCake: tHome("ctaCake"),
        ctaRecipes: tHome("ctaRecipes"),
        recentlyIndexed: tHome("recentlyIndexed"),
      }}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-6xl px-6 py-24 text-muted text-sm">…</div>}
    >
      <LandingShell />
    </Suspense>
  );
}
