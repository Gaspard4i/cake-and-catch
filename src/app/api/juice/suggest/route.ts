import { NextRequest } from "next/server";
import { listBerries } from "@/lib/db/queries";
import type {
  Apricorn,
  BerrySeasoning,
  Flavour,
  RidingStat,
} from "@/lib/recommend/aprijuice";
import {
  achievableMaxPerStat,
  suggestAprijuice,
  totalAchievableBudget,
  type TargetBoosts,
} from "@/lib/recommend/aprijuice-suggest";

type Body = {
  /** Point allocation per ride stat — what the user wants. */
  target?: Partial<Record<RidingStat, number>>;
  /** Which berry slugs the user owns. If omitted or empty, we use all. */
  ownedBerrySlugs?: string[];
  /** Which apricorn colours the user owns. If omitted, all 7 are allowed. */
  ownedApricorns?: Apricorn[];
  /** Stats the user doesn't care about — excluded from scoring. */
  ignoredStats?: RidingStat[];
  limit?: number;
};

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const target: TargetBoosts = { ...(body.target ?? {}) };
  // Drop 0/negative entries — user didn't ask for those.
  for (const k of Object.keys(target) as RidingStat[]) {
    if (!target[k] || target[k]! <= 0) delete target[k];
  }
  if (Object.keys(target).length === 0) {
    return Response.json({ suggestions: [], budget: 0, caps: {} });
  }

  const rows = await listBerries();
  const owned = body.ownedBerrySlugs && body.ownedBerrySlugs.length > 0
    ? new Set(body.ownedBerrySlugs)
    : null;
  const pool: BerrySeasoning[] = rows
    .filter((b) => (owned ? owned.has(b.slug) : true))
    .map((b) => ({
      slug: b.slug,
      itemId: b.itemId,
      flavours: b.flavours as Partial<Record<Flavour, number>>,
    }));

  const apricorns = body.ownedApricorns?.length ? body.ownedApricorns : undefined;

  const suggestions = suggestAprijuice(pool, target, {
    limit: Math.min(Math.max(body.limit ?? 6, 1), 20),
    apricorns,
    ignoredStats: body.ignoredStats,
  });

  return Response.json(
    {
      suggestions,
      budget: totalAchievableBudget(pool, apricorns ?? [
        "RED", "YELLOW", "GREEN", "BLUE", "PINK", "BLACK", "WHITE",
      ]),
      caps: achievableMaxPerStat(pool, apricorns ?? [
        "RED", "YELLOW", "GREEN", "BLUE", "PINK", "BLACK", "WHITE",
      ]),
    },
    { headers: { "cache-control": "public, s-maxage=30" } },
  );
}
