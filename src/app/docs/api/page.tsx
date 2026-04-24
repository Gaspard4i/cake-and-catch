import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API — Snack & Catch",
  description:
    "Read-only REST API over the Cobblemon data indexed by Snack & Catch.",
};

type Param = {
  name: string;
  type: string;
  required?: boolean;
  repeat?: boolean;
  description: string;
  example?: string;
};

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  summary: string;
  description?: string;
  params?: Param[];
  body?: Param[];
  examples: { request: string; response: string };
  notes?: string[];
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/recommend",
    summary:
      "Aggregated recommendation for a Pokémon: spawns + best bait seasonings.",
    params: [
      {
        name: "pokemon",
        type: "string",
        required: true,
        description: "Cobblemon species slug (lowercase).",
        example: "pikachu",
      },
      {
        name: "intent",
        type: "'spawn' | 'bait' | 'all'",
        description: "Subset of payload to return. Defaults to 'all'.",
        example: "bait",
      },
    ],
    examples: {
      request: "GET /api/recommend?pokemon=ivysaur&intent=all",
      response: `{
  "pokemon": {
    "slug": "ivysaur",
    "name": "Ivysaur",
    "dexNo": 2,
    "types": ["grass", "poison"],
    "catchRate": 45
  },
  "spawns": [
    {
      "bucket": "common",
      "weight": 9.2,
      "level": { "min": 16, "max": 32 },
      "biomes": ["minecraft:flower_forest"],
      "condition": { "timeRange": "day" },
      "source": {
        "kind": "mod",
        "name": "cobblemon",
        "url": "https://gitlab.com/cable-mc/cobblemon/..."
      }
    }
  ],
  "baits": [
    { "slug": "grepa_berry", "primaryReason": "+10× grass-type", "score": 3120 }
  ]
}`,
    },
    notes: [
      "Cached 60 s on the CDN, stale-while-revalidate 300 s.",
      "Returns 400 when `pokemon` is missing, 404 when the slug is unknown.",
    ],
  },
  {
    method: "GET",
    path: "/api/pokedex",
    summary: "Paginated Pokédex with filtering and server-side sort.",
    params: [
      { name: "q", type: "string", description: "Case-insensitive name search." },
      {
        name: "type",
        type: "string",
        repeat: true,
        description:
          "Filter by type. Repeat the parameter up to 2 times for an intersection (e.g. `type=grass&type=poison`).",
      },
      {
        name: "gen",
        type: "string",
        description: "Generation label filter, e.g. `gen1`, `gen5`.",
      },
      {
        name: "sort",
        type:
          "'dex' | 'dex_desc' | 'name' | 'name_desc' | 'hp' | 'attack' | 'speed' | 'total'",
        description:
          "Sort order across the entire dataset (not just the current page).",
      },
      {
        name: "cursor",
        type: "string",
        description:
          "Opaque keyset cursor returned as `nextCursor` by the previous page. Omit on first call.",
      },
    ],
    examples: {
      request: "GET /api/pokedex?type=grass&type=poison&sort=total&cursor=<prev>",
      response: `{
  "results": [
    {
      "id": 3,
      "slug": "venusaur",
      "name": "Venusaur",
      "dexNo": 3,
      "primaryType": "grass",
      "secondaryType": "poison",
      "baseStats": { "hp": 80, "attack": 82, "defence": 83, "special_attack": 100, "special_defence": 100, "speed": 80 },
      "catchRate": 45,
      "abilities": ["overgrow", "h:chlorophyll"],
      "labels": ["gen1", "starter"]
    }
  ],
  "nextCursor": "525|3"
}`,
    },
    notes: [
      "Page size is 48. `nextCursor` is `null` when the end of the filtered set is reached.",
      "Cursor format varies with `sort`: `<dexNo>` for dex-based sorts, `<primary>|<dexNo>` for name/stat sorts.",
    ],
  },
  {
    method: "GET",
    path: "/api/snack",
    summary: "Pantry of bait seasonings + base metadata for the Snack maker UI.",
    examples: {
      request: "GET /api/snack",
      response: `{
  "seasonings": [
    {
      "slug": "grepa_berry",
      "itemId": "cobblemon:grepa_berry",
      "kind": "berry",
      "snackValid": true,
      "category": "berry",
      "colour": "#7cff6b",
      "flavours": { "BITTER": 10 },
      "dominantFlavour": "BITTER",
      "effectTags": ["typing:grass"],
      "baitEffects": [/* formatted */ ]
    }
  ]
}`,
    },
    notes: ["Cached 60 s on the CDN."],
  },
  {
    method: "POST",
    path: "/api/snack",
    summary:
      "Compute the attracted-Pokémon ranking for a candidate Poké Snack.",
    body: [
      {
        name: "slots",
        type: "Array<string | null>",
        required: true,
        description:
          "Up to 3 seasoning slugs placed in the cooking pot. Empty slots can be `null`.",
        example: `["grepa_berry", null, null]`,
      },
      {
        name: "biomes",
        type: "string[]",
        description:
          "Restrict the world spawn pool to these biomes. Empty / omitted means all allowed biomes.",
      },
      {
        name: "times",
        type: "string[]",
        description: "Day/night filter — any of `day`, `night`, `morning`, `noon`, `dusk`.",
      },
      {
        name: "minY",
        type: "number",
        description: "Inclusive lower Y bound for the spawn filter.",
      },
      {
        name: "maxY",
        type: "number",
        description: "Inclusive upper Y bound for the spawn filter.",
      },
    ],
    examples: {
      request:
        "POST /api/snack\nContent-Type: application/json\n\n" +
        JSON.stringify(
          {
            slots: ["grepa_berry", null, null],
            biomes: [],
            times: ["day"],
            minY: -64,
            maxY: 320,
          },
          null,
          2,
        ),
      response: `{
  "snack": {
    "baitEffects": [{ "kind": "typing", "value": 10, "subcategory": "grass", "chance": 1, "title": "grass-type ×10", "description": "...", "tone": "offense" }]
  },
  "attracted": [
    {
      "slug": "bulbasaur",
      "name": "Bulbasaur",
      "dexNo": 1,
      "primaryType": "grass",
      "secondaryType": "poison",
      "bucket": "common",
      "weight": 9.2,
      "adjustedWeight": 92,
      "probability": 0.031,
      "reasons": ["grass-type ×10"],
      "levelMin": 2,
      "levelMax": 7
    }
  ]
}`,
    },
    notes: [
      "Reproduces the Cobblemon Poké Snack pipeline (uncommon ×2.25, rare/ultra-rare ×5.5, typing/egg-group ×10, `rarity_bucket` softening). Probabilities are approximate — see the WIP notice in the UI.",
    ],
  },
  {
    method: "GET",
    path: "/api/juice",
    summary: "Berry list for the Aprijuice maker.",
    examples: {
      request: "GET /api/juice",
      response: `{
  "berries": [
    {
      "slug": "cheri_berry",
      "itemId": "cobblemon:cheri_berry",
      "colour": "#e85a3a",
      "flavours": { "SPICY": 10 }
    }
  ]
}`,
    },
  },
  {
    method: "POST",
    path: "/api/juice",
    summary:
      "Compute the ride stat boosts produced by an apricorn + berry seasoning combo.",
    body: [
      {
        name: "apricorn",
        type: "'RED' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PINK' | 'BLACK' | 'WHITE'",
        required: true,
        description: "Apricorn colour driving the baked-in stat deltas.",
      },
      {
        name: "berrySlugs",
        type: "string[]",
        description:
          "Up to 3 berry slugs dropped as seasoning (Cobblemon campfire pot hard cap).",
      },
    ],
    examples: {
      request:
        "POST /api/juice\nContent-Type: application/json\n\n" +
        JSON.stringify({ apricorn: "RED", berrySlugs: ["cheri_berry"] }, null, 2),
      response: `{
  "flavourTotals": { "SPICY": 10, "DRY": 0, "SWEET": 0, "SOUR": 0, "BITTER": 0 },
  "pointsFromFlavours": { "ACCELERATION": 0, "SKILL": 0, "SPEED": 0, "STAMINA": 0, "JUMP": 0 },
  "summary": [
    { "stat": "ACCELERATION", "delta": 3, "fromBerries": 0, "fromApricorn": 3 }
  ]
}`,
    },
  },
  {
    method: "GET",
    path: "/api/biomes",
    summary: "Biome catalog grouped by namespace (Cobblemon tags, vanilla, mods).",
    examples: {
      request: "GET /api/biomes",
      response: `{
  "biomes": [
    { "value": "#cobblemon:is_forest", "label": "Forest (tag)", "namespace": "cobblemon" },
    { "value": "minecraft:plains", "label": "Plains", "namespace": "minecraft" }
  ]
}`,
    },
  },
  {
    method: "GET",
    path: "/api/suggest",
    summary: "Autocomplete endpoint for the home search (Pokémon + biomes).",
    params: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "User input, at least 2 characters.",
      },
    ],
    examples: {
      request: "GET /api/suggest?q=pika",
      response: `{
  "pokemon": [{ "slug": "pikachu", "name": "Pikachu", "dexNo": 25 }],
  "biomes": []
}`,
    },
  },
];

function ParamRow({ p }: { p: Param }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3 align-top font-mono text-xs">
        {p.name}
        {p.required && <span className="ml-1 text-red-500">*</span>}
        {p.repeat && <span className="ml-1 text-accent">[]</span>}
      </td>
      <td className="py-2 pr-3 align-top font-mono text-[11px] text-muted">
        {p.type}
      </td>
      <td className="py-2 text-xs text-muted">
        <div>{p.description}</div>
        {p.example && (
          <div className="mt-1 font-mono text-[11px] text-accent">{p.example}</div>
        )}
      </td>
    </tr>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const id = `${ep.method}-${ep.path}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section id={id} className="rounded-xl border border-border bg-card p-5 scroll-mt-24">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
            ep.method === "GET"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          }`}
        >
          {ep.method}
        </span>
        <code className="font-mono text-sm">{ep.path}</code>
      </div>
      <p className="mt-2 text-sm">{ep.summary}</p>
      {ep.description && <p className="mt-1 text-xs text-muted">{ep.description}</p>}

      {(ep.params?.length ?? 0) > 0 && (
        <>
          <h4 className="mt-4 text-[10px] uppercase tracking-wide text-muted">
            Query params
          </h4>
          <table className="mt-1 w-full text-left">
            <thead className="sr-only">
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {ep.params!.map((p) => (
                <ParamRow key={p.name} p={p} />
              ))}
            </tbody>
          </table>
        </>
      )}

      {(ep.body?.length ?? 0) > 0 && (
        <>
          <h4 className="mt-4 text-[10px] uppercase tracking-wide text-muted">
            Request body (application/json)
          </h4>
          <table className="mt-1 w-full text-left">
            <tbody>
              {ep.body!.map((p) => (
                <ParamRow key={p.name} p={p} />
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 className="mt-4 text-[10px] uppercase tracking-wide text-muted">Example</h4>
      <pre className="mt-1 rounded-lg border border-border bg-subtle p-3 overflow-x-auto text-[11px] font-mono whitespace-pre">
        {ep.examples.request}
      </pre>
      <pre className="mt-2 rounded-lg border border-border bg-subtle p-3 overflow-x-auto text-[11px] font-mono whitespace-pre">
        {ep.examples.response}
      </pre>

      {ep.notes && ep.notes.length > 0 && (
        <ul className="mt-3 text-xs text-muted list-disc pl-5 space-y-1">
          {ep.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Public API</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Read-only JSON endpoints over the Cobblemon data indexed by Snack &amp; Catch.
        No authentication. Responses are cached on the CDN (s-maxage 30–60 s depending
        on the endpoint). Data licenses are listed on the{" "}
        <a href="/about" className="underline hover:text-foreground">
          About page
        </a>
        .
      </p>

      <div className="mt-4 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-xs">
        Please cache aggressively and avoid hammering the server. If you need a
        specific endpoint or filter that does not exist yet, open an issue on the{" "}
        <a
          href="https://github.com/Gaspard4i/snack-and-catch/issues"
          target="_blank"
          rel="noreferrer"
          className="underline font-medium"
        >
          GitHub repo
        </a>
        .
      </div>

      <nav className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted">
          Endpoints
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ENDPOINTS.map((ep) => {
            const id = `${ep.method}-${ep.path}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
            return (
              <li key={id}>
                <a href={`#${id}`} className="font-mono text-xs hover:text-foreground">
                  <span className="text-muted">{ep.method}</span> {ep.path}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-8 space-y-6">
        {ENDPOINTS.map((ep) => (
          <EndpointCard
            key={`${ep.method}-${ep.path}`}
            ep={ep}
          />
        ))}
      </div>
    </div>
  );
}
