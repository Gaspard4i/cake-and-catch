import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CakePageClient } from "@/components/CakePageClient";

async function CakeShell() {
  const t = await getTranslations("cake");
  return <CakePageClient title={t("title")} intro={t("intro")} />;
}

export default function CakePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Suspense fallback={<div className="text-muted text-sm">…</div>}>
        <CakeShell />
      </Suspense>
    </div>
  );
}
