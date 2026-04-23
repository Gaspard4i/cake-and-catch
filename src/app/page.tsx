import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { countSpecies } from "@/lib/db/queries";
import { Landing } from "@/components/Landing";

async function LandingShell() {
  const [t, total] = await Promise.all([
    getTranslations("app"),
    countSpecies(),
  ]);
  return (
    <Landing
      labels={{
        tagline: t("tagline"),
        indexedSpecies: t("indexedSpecies", { count: total }),
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
