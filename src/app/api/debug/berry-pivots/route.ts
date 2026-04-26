import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";

/**
 * Dev-only route to persist /debug/berry-pivot edits straight into the
 * source file. Disabled in production to avoid letting random visitors
 * rewrite our codebase. The file is regenerated from the POSTed registry
 * with stable, sorted keys so diffs stay clean.
 */

const FILE_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "snack",
  "berry-pivots.ts",
);

type Pivot = Partial<{
  cx: number;
  cy: number;
  cz: number;
  dx: number;
  dy: number;
  dz: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
}>;

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function GET() {
  if (isProd()) return Response.json({ error: "disabled" }, { status: 403 });
  const src = await readFile(FILE_PATH, "utf8");
  // Eval the BERRY_PIVOTS object literal by extracting the JSON-like body.
  const match = src.match(/BERRY_PIVOTS\s*:\s*Record<[^>]+>\s*=\s*(\{[\s\S]*?^\});/m);
  if (!match) return Response.json({ pivots: {} });
  // Strip comments + trailing commas so JSON.parse works.
  const cleaned = match[1]
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1")
    // Quote bare keys.
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  try {
    const pivots = JSON.parse(cleaned) as Record<string, Pivot>;
    return Response.json({ pivots });
  } catch {
    return Response.json({ pivots: {} });
  }
}

export async function POST(req: NextRequest) {
  if (isProd()) return Response.json({ error: "disabled" }, { status: 403 });
  let body: { pivots?: Record<string, Pivot> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const pivots = body.pivots ?? {};
  const src = await readFile(FILE_PATH, "utf8");
  const next = src.replace(
    /(export const BERRY_PIVOTS: Record<string, BerryPivot> = )\{[\s\S]*?\};/m,
    `$1${formatRegistry(pivots)};`,
  );
  await writeFile(FILE_PATH, next, "utf8");
  return Response.json({ ok: true, count: Object.keys(pivots).length });
}

function formatRegistry(pivots: Record<string, Pivot>): string {
  const slugs = Object.keys(pivots).sort();
  if (slugs.length === 0) return "{}";
  const lines = slugs.map((slug) => {
    const p = pivots[slug];
    const entries: string[] = [];
    for (const k of ["cx", "cy", "cz", "dx", "dy", "dz", "rx", "ry", "rz", "scale"] as const) {
      const v = p[k];
      if (v != null && v !== 0 && !(k === "scale" && v === 1)) {
        entries.push(`${k}: ${round(v)}`);
      }
    }
    return `  ${slug}: { ${entries.join(", ")} },`;
  });
  return `{\n${lines.join("\n")}\n}`;
}

function round(n: number, p = 4) {
  return Number.parseFloat(n.toFixed(p));
}
