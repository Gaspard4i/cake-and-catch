import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/Loader";

export const metadata = { title: "Aprijuice maker" };

const JuiceMaker = dynamic(() =>
  import("@/components/JuiceMaker").then((m) => m.JuiceMaker),
);

export default function JuicePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Aprijuice maker</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Brew an aprijuice in the Campfire Pot. The apricorn colour provides a
        baked-in set of ride stat deltas; berries added as seasoning contribute
        flavour points that convert into extra boosts via the threshold table
        (15 → 1pt, 35 → 2pt, 45 → 3pt, 55 → 4pt, 75 → 5pt, 105 → 6pt).
      </p>

      <div className="mt-8">
        <Suspense fallback={<PageSkeleton variant="juice" />}>
          <JuiceMaker />
        </Suspense>
      </div>
    </div>
  );
}
