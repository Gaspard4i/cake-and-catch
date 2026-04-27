import { notFound } from "next/navigation";
import { listBerries } from "@/lib/db/queries";
import { BerryDebugClient } from "./BerryDebugClient";

type Params = { slug: string };

export const metadata = {
  title: "Berry debug — Snack & Catch",
};

export default async function BerryDebugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const berries = await listBerries();
  const berry = berries.find((b) => b.slug === slug);
  if (!berry) notFound();

  // Sorted slug list for prev/next nav.
  const slugs = [...berries].map((b) => b.slug).sort();

  return (
    <BerryDebugClient
      slug={berry.slug}
      itemId={berry.itemId}
      fruitModel={berry.fruitModel ?? ""}
      fruitTexture={berry.fruitTexture ?? null}
      slugs={slugs}
    />
  );
}
