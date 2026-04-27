import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SnackPageClient } from "@/components/SnackPageClient";
import { PageSkeleton } from "@/components/Loader";

async function SnackShell() {
  const t = await getTranslations("cake");
  return <SnackPageClient title={t("title")} intro={t("intro")} />;
}

export default function SnackPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-10">
      <Suspense fallback={<PageSkeleton variant="snack" />}>
        <SnackShell />
      </Suspense>
    </div>
  );
}
