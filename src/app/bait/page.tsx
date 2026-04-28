import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BaitPageClient } from "@/components/BaitPageClient";
import { PageSkeleton } from "@/components/Loader";

export const metadata = { title: "Bait maker" };

async function BaitShell() {
  const t = await getTranslations("bait");
  return <BaitPageClient title={t("title")} intro={t("intro")} />;
}

export default function BaitPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-10">
      <Suspense fallback={<PageSkeleton variant="snack" />}>
        <BaitShell />
      </Suspense>
    </div>
  );
}
