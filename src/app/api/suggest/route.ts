import { NextRequest } from "next/server";
import { searchSpecies } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return Response.json({ results: [] });
  }
  const rows = await searchSpecies(q, 8);
  const results = rows.map((s) => ({
    slug: s.slug,
    name: s.name,
    dexNo: s.dexNo,
    primaryType: s.primaryType,
    secondaryType: s.secondaryType,
  }));
  return Response.json({ results });
}
