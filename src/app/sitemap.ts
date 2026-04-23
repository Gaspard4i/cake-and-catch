import type { MetadataRoute } from "next";
import { db, safe, schema } from "@/lib/db/client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const species = await safe(
    () =>
      db
        .select({ slug: schema.species.slug, updatedAt: schema.species.updatedAt })
        .from(schema.species),
    [] as Array<{ slug: string; updatedAt: Date }>,
  );

  const routes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/pokedex`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/search`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/cake`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/recipes`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: "yearly", priority: 0.3 },
  ];

  for (const s of species) {
    routes.push({
      url: `${BASE}/pokemon/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return routes;
}
