import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, safe, schema } from "@/lib/db/client";

type Body = {
  stars?: number;
  comment?: string | null;
  locale?: string | null;
};

/**
 * Record a satisfaction rating (1-5 stars + optional comment) and bump
 * the aggregate counter. Client guards against duplicate submissions
 * (localStorage flag) but we also hash the IP server-side so repeated
 * anonymous abuse can be detected later if needed.
 */
export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return Response.json({ error: "stars must be 1-5" }, { status: 400 });
  }
  const comment =
    typeof body.comment === "string" && body.comment.trim()
      ? body.comment.trim().slice(0, 1000)
      : null;
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 10) : null;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "";
  const secret = process.env.RATING_SALT ?? "snack-and-catch";
  const ipHash = createHash("sha256").update(`${secret}:${ip}`).digest("hex");

  await safe(async () => {
    await db.insert(schema.siteRatings).values({
      stars,
      comment,
      locale,
      ipHash,
    });
    await db
      .insert(schema.siteStats)
      .values({ id: 1, ratingCount: 1, ratingSum: stars })
      .onConflictDoUpdate({
        target: schema.siteStats.id,
        set: {
          ratingCount: sql`${schema.siteStats.ratingCount} + 1`,
          ratingSum: sql`${schema.siteStats.ratingSum} + ${stars}`,
          updatedAt: new Date(),
        },
      });
  }, undefined);

  return Response.json({ ok: true });
}
