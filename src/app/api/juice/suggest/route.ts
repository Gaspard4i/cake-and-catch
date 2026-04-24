import { NextRequest } from "next/server";
import { listBerries } from "@/lib/db/queries";
import type { BerrySeasoning, Flavour, RidingStat } from "@/lib/recommend/aprijuice";
import {
  suggestAprijuice,
  type TargetWeights,
} from "@/lib/recommend/aprijuice-suggest";

type Body = {
  /** Desired ride stats. Omitted or 0 = not wanted. */
  weights?: Partial<Record<RidingStat, number>>;
  /** Convenience: list of stats the user wants, each weighted equally to 1. */
  stats?: RidingStat[];
  limit?: number;
};

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  // Normalise weights: explicit `weights` wins, otherwise treat `stats` as 1s.
  const weights: TargetWeights = { ...(body.weights ?? {}) };
  for (const s of body.stats ?? []) {
    if (weights[s] === undefined) weights[s] = 1;
  }
  // Drop null/0 entries; if nothing left, nothing to suggest.
  for (const k of Object.keys(weights) as RidingStat[]) {
    if (!weights[k]) delete weights[k];
  }
  if (Object.keys(weights).length === 0) {
    return Response.json({ suggestions: [] });
  }

  const rows = await listBerries();
  const pool: BerrySeasoning[] = rows.map((b) => ({
    slug: b.slug,
    itemId: b.itemId,
    flavours: b.flavours as Partial<Record<Flavour, number>>,
  }));

  const suggestions = suggestAprijuice(pool, weights, {
    limit: Math.min(Math.max(body.limit ?? 6, 1), 20),
  });

  return Response.json(
    { suggestions },
    { headers: { "cache-control": "public, s-maxage=30" } },
  );
}
