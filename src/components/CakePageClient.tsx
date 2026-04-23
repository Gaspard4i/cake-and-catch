"use client";

import dynamic from "next/dynamic";

const Cake3D = dynamic(() => import("./Cake3D").then((m) => m.Cake3D), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-border bg-subtle size-[200px]" />,
});

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
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">{intro}</p>
        </div>
        <Cake3D flavour={null} />
      </div>

      <div className="mt-8">
        <CampfirePot />
      </div>
    </>
  );
}
