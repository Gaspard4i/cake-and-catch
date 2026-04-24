"use client";

import dynamic from "next/dynamic";

const CampfirePot = dynamic(() => import("./CampfirePot").then((m) => m.CampfirePot), {
  ssr: false,
  loading: () => <div className="text-muted text-sm">…</div>,
});
const SnackBaseRecipe = dynamic(
  () => import("./CampfirePot").then((m) => m.SnackBaseRecipe),
  { ssr: false },
);

export function SnackPageClient({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  return (
    <>
      <header className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm sm:text-base text-muted">{intro}</p>
        </div>
        <div className="shrink-0">
          <SnackBaseRecipe size={40} />
        </div>
      </header>

      <div className="mt-6 sm:mt-8">
        <CampfirePot />
      </div>
    </>
  );
}
