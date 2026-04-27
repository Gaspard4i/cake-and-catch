"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "./Loader";

const CampfirePot = dynamic(() => import("./CampfirePot").then((m) => m.CampfirePot), {
  ssr: false,
  loading: () => <PageSkeleton variant="snack" />,
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
      <header className="flex flex-row items-start justify-between gap-3 sm:gap-8">
        <div className="max-w-2xl flex-1 min-w-0">
          <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
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
