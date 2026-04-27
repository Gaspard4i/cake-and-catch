import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { countSpecies } from "@/lib/db/queries";
import { Landing } from "@/components/Landing";
import { Skeleton } from "@/components/Loader";

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

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-8 md:grid-cols-[1fr_auto] items-start">
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-9 w-full max-w-md mt-4" />
          <div className="flex gap-3 mt-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="hidden md:block size-[280px] rounded-lg" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <LandingShell />
    </Suspense>
  );
}
