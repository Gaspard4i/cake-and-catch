import { NextRequest } from "next/server";
import { listBerries } from "@/lib/db/queries";
import {
  cookAprijuice,
  type Apricorn,
  type BerrySeasoning,
  type Flavour,
} from "@/lib/recommend/aprijuice";

type Body = {
  apricorn?: Apricorn;
  berrySlugs?: string[];
};

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const apricorn = (body.apricorn ?? "RED") as Apricorn;
  const slugs = (body.berrySlugs ?? []).slice(0, 6);

  const berries = await listBerries();
  const bySlug = new Map(berries.map((b) => [b.slug, b]));

  const recipe: BerrySeasoning[] = slugs
    .map((s) => bySlug.get(s))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map((b) => ({
      slug: b.slug,
      itemId: b.itemId,
      flavours: b.flavours as Partial<Record<Flavour, number>>,
    }));

  const result = cookAprijuice({ apricorn, berries: recipe });
  return Response.json(result, {
    headers: { "cache-control": "public, s-maxage=30" },
  });
}

export async function GET() {
  const berries = await listBerries();
  return Response.json(
    {
      apricorns: ["RED", "BLUE", "GREEN", "YELLOW", "BLACK", "WHITE", "PINK"],
      berries: berries.map((b) => ({
        slug: b.slug,
        itemId: b.itemId,
        colour: b.colour,
        flavours: b.flavours,
      })),
    },
    { headers: { "cache-control": "public, s-maxage=300" } },
  );
}
