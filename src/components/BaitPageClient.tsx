"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "./Loader";

const CampfirePot = dynamic(() => import("./CampfirePot").then((m) => m.CampfirePot), {
  ssr: false,
  loading: () => <PageSkeleton variant="snack" />,
});

export function BaitPageClient({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm sm:text-base text-muted">{intro}</p>
      </header>

      <div className="mt-6 sm:mt-8">
        <CampfirePot mode="bait" />
      </div>
    </>
  );
}
