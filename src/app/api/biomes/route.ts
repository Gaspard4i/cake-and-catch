import { listDistinctBiomes } from "@/lib/db/queries";

/**
 * Returns every biome tag/id that the DB knows about, grouped by namespace
 * so the UI can render a multi-select with Cobblemon + Minecraft vanilla +
 * mod-added biomes (terralith, byg, etc.) in separate sections.
 */
export async function GET() {
  const raw = await listDistinctBiomes();

  type Entry = {
    value: string;
    label: string;
    namespace: string;
  };

  const entries: Entry[] = raw.map((b) => {
    const stripped = b.replace(/^#/, "");
    const [ns, rest] = stripped.includes(":") ? stripped.split(":", 2) : ["", stripped];
    const label = rest
      .replace(/^is_/, "")
      .replaceAll("_", " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    return { value: b, label, namespace: ns };
  });

  entries.sort((a, b) => a.label.localeCompare(b.label));

  const byNs = new Map<string, Entry[]>();
  for (const e of entries) {
    const arr = byNs.get(e.namespace) ?? [];
    arr.push(e);
    byNs.set(e.namespace, arr);
  }

  return Response.json(
    {
      namespaces: [...byNs.keys()].sort(),
      biomes: entries,
    },
    { headers: { "cache-control": "public, s-maxage=300" } },
  );
}
