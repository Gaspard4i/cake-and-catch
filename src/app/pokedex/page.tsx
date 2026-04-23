import { getTranslations } from "next-intl/server";
import { PokedexGrid } from "@/components/PokedexGrid";
import { Suspense } from "react";

async function PokedexHeader() {
  const t = await getTranslations("pokedex");
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted max-w-2xl">{t("intro")}</p>
    </>
  );
}

export default function PokedexPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Suspense fallback={<div className="text-muted text-sm">…</div>}>
        <PokedexHeader />
      </Suspense>
      <PokedexGrid />
    </div>
  );
}
