import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SnackPageClient } from "@/components/SnackPageClient";

async function SnackShell() {
  const t = await getTranslations("cake");
  return <SnackPageClient title={t("title")} intro={t("intro")} />;
}

export default function SnackPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <Suspense fallback={<div className="text-muted text-sm">â€¦</div>}>
        <SnackShell />
      </Suspense>
    </div>
  );
}
