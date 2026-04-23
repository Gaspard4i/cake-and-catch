import { NextRequest } from "next/server";
import { and, asc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

const PAGE_SIZE = 48;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const type = params.get("type")?.trim();
  const gen = params.get("gen")?.trim();
  const cursorDex = Number.parseInt(params.get("cursor") ?? "0", 10);

  const where = [] as ReturnType<typeof eq>[];
  if (cursorDex > 0) where.push(gt(schema.species.dexNo, cursorDex));
  if (q) where.push(ilike(schema.species.name, `%${q}%`));
  if (type)
    where.push(
      or(
        eq(schema.species.primaryType, type),
        eq(schema.species.secondaryType, type),
      )!,
    );
  if (gen) {
    where.push(sql`${schema.species.labels}::jsonb @> ${JSON.stringify([gen])}::jsonb`);
  }

  const rows = await db
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
    })
    .from(schema.species)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(asc(schema.species.dexNo))
    .limit(PAGE_SIZE);

  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].dexNo : null;

  return Response.json(
    { results: rows, nextCursor },
    { headers: { "cache-control": "public, s-maxage=30" } },
  );
}
