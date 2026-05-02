import { NextRequest } from "next/server";
import { and, asc, desc, eq, gt, lt, ilike, or, sql, SQL } from "drizzle-orm";
import { db, safe, schema } from "@/lib/db/client";

const PAGE_SIZE = 48;

type SortKey = "dex" | "dex_desc" | "name" | "name_desc" | "hp" | "attack" | "speed" | "total";

/**
 * Cursor format per sort:
 *   - dex / dex_desc        -> "<dexNo>"
 *   - name / name_desc      -> "<name>|<dexNo>"           (dexNo as tiebreaker)
 *   - hp/attack/speed/total -> "<statValue>|<dexNo>"      (stat desc, tiebreaker dexNo asc)
 *
 * Using a keyset (seek) cursor keeps pagination consistent across the whole
 * filtered set without skipping rows when the sort key has duplicates.
 */
function parseCursor(raw: string | null): { primary: string; dex: number } | null {
  if (!raw) return null;
  const [primary, dexStr] = raw.split("|");
  const dex = Number.parseInt(dexStr ?? primary, 10);
  if (Number.isNaN(dex)) return null;
  return { primary: primary ?? "", dex };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const allTypes = params.getAll("type").map((t) => t.trim()).filter(Boolean).slice(0, 2);
  const gen = params.get("gen")?.trim();
  const labels = params.getAll("label").map((l) => l.trim()).filter(Boolean);
  const sort = (params.get("sort") ?? "dex") as SortKey;
  const cursor = parseCursor(params.get("cursor"));
  /**
   * Default Cobbledex view = base species + regional variants only.
   * Mimic forms (mega/gmax/cosmetic/drives/plates) appear only when
   * the player explicitly opts in via `?label=variant`. Regional
   * variants stay visible thanks to their `regional` label, regardless.
   */
  const includeMimicVariants = labels.includes("variant");

  const totalExpr = sql<number>`(
    COALESCE((${schema.species.baseStats} ->> 'hp')::int, 0) +
    COALESCE((${schema.species.baseStats} ->> 'attack')::int, 0) +
    COALESCE((${schema.species.baseStats} ->> 'defence')::int, 0) +
    COALESCE((${schema.species.baseStats} ->> 'special_attack')::int, 0) +
    COALESCE((${schema.species.baseStats} ->> 'special_defence')::int, 0) +
    COALESCE((${schema.species.baseStats} ->> 'speed')::int, 0)
  )`;
  const statExpr = (key: "hp" | "attack" | "speed") =>
    sql<number>`COALESCE((${schema.species.baseStats} ->> ${key})::int, 0)`;

  const rows = await safe(async () => {
    const where: SQL[] = [];
    if (q) where.push(ilike(schema.species.name, `%${q}%`));
    // Intersection on types: each selected type must be either primary or
    // secondary. Up to 2 types.
    for (const t of allTypes) {
      where.push(
        or(
          eq(schema.species.primaryType, t),
          eq(schema.species.secondaryType, t),
        )!,
      );
    }
    if (gen) {
      where.push(sql`${schema.species.labels}::jsonb @> ${JSON.stringify([gen])}::jsonb`);
    }
    // Honour the labels filter the client sends. `regional` and
    // `variant` are inclusive switches — they widen what we return.
    // Other labels narrow the result (starter, legendary, mythical…).
    for (const l of labels) {
      if (l === "regional" || l === "variant") continue;
      where.push(sql`${schema.species.labels}::jsonb @> ${JSON.stringify([l])}::jsonb`);
    }
    // Default-hide mimic variants (mega/gmax/cosplay/etc.). Regional
    // variants carry the `regional` label and stay visible.
    if (!includeMimicVariants) {
      where.push(sql`(
        ${schema.species.variantOfSpeciesId} IS NULL
        OR ${schema.species.labels}::jsonb @> '["regional"]'::jsonb
      )`);
    }

    if (cursor) {
      if (sort === "dex") {
        where.push(gt(schema.species.dexNo, cursor.dex));
      } else if (sort === "dex_desc") {
        where.push(lt(schema.species.dexNo, cursor.dex));
      } else if (sort === "name" || sort === "name_desc") {
        const op = sort === "name" ? sql`>` : sql`<`;
        where.push(
          sql`(${schema.species.name}, ${schema.species.dexNo}) ${op} (${cursor.primary}, ${cursor.dex})`,
        );
      } else {
        const expr = sort === "total" ? totalExpr : statExpr(sort);
        const primary = Number.parseInt(cursor.primary, 10);
        where.push(
          sql`(${expr}, ${schema.species.dexNo}) < (${primary}, ${cursor.dex})`,
        );
      }
    }

    let orderBy: SQL[];
    switch (sort) {
      case "dex":
        orderBy = [asc(schema.species.dexNo)];
        break;
      case "dex_desc":
        orderBy = [desc(schema.species.dexNo)];
        break;
      case "name":
        orderBy = [asc(schema.species.name), asc(schema.species.dexNo)];
        break;
      case "name_desc":
        orderBy = [desc(schema.species.name), desc(schema.species.dexNo)];
        break;
      case "total":
        orderBy = [desc(totalExpr), asc(schema.species.dexNo)];
        break;
      default:
        orderBy = [desc(statExpr(sort)), asc(schema.species.dexNo)];
    }

    return db
      .select({
        id: schema.species.id,
        slug: schema.species.slug,
        name: schema.species.name,
        dexNo: schema.species.dexNo,
        primaryType: schema.species.primaryType,
        secondaryType: schema.species.secondaryType,
        baseStats: schema.species.baseStats,
        catchRate: schema.species.catchRate,
        abilities: schema.species.abilities,
        labels: schema.species.labels,
        variantOfSpeciesId: schema.species.variantOfSpeciesId,
        variantLabel: schema.species.variantLabel,
      })
      .from(schema.species)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(...orderBy)
      .limit(PAGE_SIZE);
  }, [] as Array<{
    id: number;
    slug: string;
    name: string;
    dexNo: number;
    primaryType: string;
    secondaryType: string | null;
    baseStats: Record<string, number>;
    catchRate: number;
    abilities: string[];
    labels: string[];
    variantOfSpeciesId: number | null;
    variantLabel: string | null;
  }>);

  let nextCursor: string | null = null;
  if (rows.length === PAGE_SIZE) {
    const last = rows[rows.length - 1];
    const total =
      (last.baseStats.hp ?? 0) +
      (last.baseStats.attack ?? 0) +
      (last.baseStats.defence ?? 0) +
      (last.baseStats.special_attack ?? 0) +
      (last.baseStats.special_defence ?? 0) +
      (last.baseStats.speed ?? 0);
    switch (sort) {
      case "dex":
      case "dex_desc":
        nextCursor = String(last.dexNo);
        break;
      case "name":
      case "name_desc":
        nextCursor = `${last.name}|${last.dexNo}`;
        break;
      case "total":
        nextCursor = `${total}|${last.dexNo}`;
        break;
      default:
        nextCursor = `${last.baseStats[sort] ?? 0}|${last.dexNo}`;
    }
  }

  return Response.json(
    { results: rows, nextCursor },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
