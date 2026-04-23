import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db/client";
import { fetchWikiSummary } from "../src/lib/sources/wiki";

const DELAY_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const speciesRows = await db
    .select({ id: schema.species.id, slug: schema.species.slug, name: schema.species.name })
    .from(schema.species)
    .orderBy(schema.species.dexNo);

  console.log(`[wiki] enriching ${speciesRows.length} species…`);

  let ok = 0;
  let missing = 0;
  let failed = 0;

  for (const s of speciesRows) {
    try {
      const summary = await fetchWikiSummary(s.name);
      if (!summary) {
        missing++;
        continue;
      }
      await db
        .insert(schema.speciesWiki)
        .values({
          speciesId: s.id,
          pageTitle: summary.title,
          pageUrl: summary.url,
          summary: summary.extract,
        })
        .onConflictDoUpdate({
          target: schema.speciesWiki.speciesId,
          set: {
            pageTitle: summary.title,
            pageUrl: summary.url,
            summary: summary.extract,
            fetchedAt: new Date(),
          },
        });
      ok++;
      if (ok % 50 === 0) console.log(`[wiki] progress ok=${ok} missing=${missing}`);
    } catch (err) {
      failed++;
      console.warn(`[wiki] ${s.name}:`, err instanceof Error ? err.message : err);
    }
    await sleep(DELAY_MS);
  }
  console.log(`[wiki] done ok=${ok} missing=${missing} failed=${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
