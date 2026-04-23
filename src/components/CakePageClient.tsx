"use client";

import dynamic from "next/dynamic";

const CampfirePot = dynamic(() => import("./CampfirePot").then((m) => m.CampfirePot), {
  ssr: false,
  loading: () => <div className="text-muted text-sm">…</div>,
});

export function CakePageClient({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted">{intro}</p>
      </div>

      <div className="mt-8">
        <CampfirePot />
      </div>
    </>
  );
}
