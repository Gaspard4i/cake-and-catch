import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db/client";

/**
 * Build a short, informative description from the berry JSON data itself.
 * The Cobblemon wiki redirects every "<Name> Berry" page to the generic
 * "Berry" article, so scraping it doesn't yield distinct content. We rely
 * on the JSON instead.
 */
function describe(raw: Record<string, unknown>, slug: string): string {
  const flavours = (raw.flavours ?? {}) as Record<string, number>;
  const nonzero = Object.entries(flavours)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const flavourTxt =
    nonzero.length === 0
      ? "no declared flavour"
      : nonzero
          .map(([k, v]) => `${k.toLowerCase()} ${v}`)
          .join(", ");

  const colour = (raw.colour as string | undefined)?.toLowerCase() ?? "undefined";
  const mutations = raw.mutations as Record<string, string> | undefined;
  const mutCount = mutations ? Object.keys(mutations).length : 0;

  const growthTime = raw.growthTime as number | undefined;
  const lifeCycles = raw.lifeCycles as number | undefined;
  const yieldMin = raw.yield_min ?? raw.yieldMin;
  const yieldMax = raw.yield_max ?? raw.yieldMax;

  const parts = [
    `Flavour profile: ${flavourTxt}.`,
    `Colour: ${colour}.`,
  ];
  if (typeof growthTime === "number") parts.push(`Growth: ${growthTime}t stage.`);
  if (typeof lifeCycles === "number") parts.push(`${lifeCycles} life cycles.`);
  if (yieldMin || yieldMax) parts.push(`Yields ${yieldMin ?? "?"}–${yieldMax ?? "?"}.`);
  if (mutCount > 0) parts.push(`Crosses with ${mutCount} other berries.`);

  return parts.join(" ");
}

async function main() {
  const rows = await db
    .select({ id: schema.berries.id, slug: schema.berries.slug, raw: schema.berries.raw })
    .from(schema.berries);
  console.log(`[berries-desc] composing ${rows.length} descriptions from upstream JSON…`);
  for (const b of rows) {
    const description = describe(b.raw as Record<string, unknown>, b.slug);
    await db
      .update(schema.berries)
      .set({ description })
      .where(eq(schema.berries.id, b.id));
  }
  console.log(`[berries-desc] done`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
