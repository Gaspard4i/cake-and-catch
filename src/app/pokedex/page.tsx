import { getTranslations } from "next-intl/server";
import { PokedexGrid } from "@/components/PokedexGrid";
import { Skeleton } from "@/components/Loader";
import { Suspense } from "react";

async function PokedexHeader() {
  const t = await getTranslations("pokedex");
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm sm:text-base text-muted max-w-2xl">{t("intro")}</p>
    </>
  );
}

export default function PokedexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <Suspense
        fallback={
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        }
      >
        <PokedexHeader />
      </Suspense>
      <PokedexGrid />
    </div>
  );
}
