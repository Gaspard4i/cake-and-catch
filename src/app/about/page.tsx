import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

type SourceEntry = {
  name: string;
  license: string;
  url: string;
  purpose: string;
};

const DATA_SOURCES: SourceEntry[] = [
  {
    name: "Cobblemon",
    license: "MPL 2.0",
    url: "https://gitlab.com/cable-mc/cobblemon",
    purpose:
      "Source of truth — species JSON, spawn_pool_world, recipes, seasonings, spawn_bait_effects, tags. All Poké Snack / Aprijuice / bait / spawn logic is reproduced from the mod's Kotlin sources.",
  },
  {
    name: "Cobblemon Wiki",
    license: "CC BY 4.0",
    url: "https://wiki.cobblemon.com",
    purpose: "Cross-checks on mechanics, seasoning pages, Pokémon notes.",
  },
  {
    name: "MysticMons",
    license: "ARR (free add-on)",
    url: "https://modrinth.com/datapack/mysticmons",
    purpose: "Addon species + spawns merged into the Pokédex and snack attraction pool.",
  },
  {
    name: "Better Cobblemon Spawns",
    license: "ARR (free add-on)",
    url: "https://modrinth.com/mod/better-cobblemon-spawns",
    purpose: "Addon spawn rebalance — used to extend the biome/weight catalog.",
  },
  {
    name: "Terralith / Biomes O' Plenty / BYG / Aether / Incendium / Nullscape / The Bumblezone",
    license: "Respective authors",
    url: "https://modrinth.com",
    purpose:
      "Modded biome namespaces referenced in Cobblemon spawn conditions. Only biome ids are used.",
  },
];

const ASSET_SOURCES: SourceEntry[] = [
  {
    name: "PokeAPI sprites",
    license: "MIT / public",
    url: "https://github.com/PokeAPI/sprites",
    purpose:
      "Pokémon sprites (default + shiny) served through jsdelivr from the official PokeAPI sprites repository.",
  },
  {
    name: "PokeAPI type icons",
    license: "Fair use · trademark acknowledged",
    url: "https://pokeapi.co",
    purpose:
      "Type badges (normal/fire/water…) rendered in the pokédex, attracted grid and bait effect summary.",
  },
  {
    name: "InventivetalentDev/minecraft-assets",
    license: "Minecraft EULA",
    url: "https://github.com/InventivetalentDev/minecraft-assets",
    purpose: "Vanilla item textures (honey bottle, milk bucket, golden apple, etc.).",
  },
  {
    name: "Cobblemon assets (GitLab raw)",
    license: "MPL 2.0",
    url: "https://gitlab.com/cable-mc/cobblemon/-/tree/main/common/src/main/resources/assets/cobblemon",
    purpose:
      "Cobblemon item textures, berry textures, Poké Snack `.geo.json` block model, pot colours.",
  },
];

function SourceList({ items }: { items: SourceEntry[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {items.map((s) => (
        <li
          key={s.name + s.url}
          className="rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="font-medium">{s.name}</div>
            <span className="text-[10px] uppercase font-mono text-muted rounded-full border border-border px-2 py-0.5">
              {s.license}
            </span>
          </div>
          <div className="mt-1 text-muted text-xs leading-relaxed">{s.purpose}</div>
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs underline hover:text-foreground break-all"
          >
            {s.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

async function AboutContent() {
  const t = await getTranslations("about");
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Credits</h2>
        <div className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm">
          <p>
            Built by{" "}
            <a
              href="https://github.com/Gaspard4i"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline hover:text-foreground"
            >
              Gaspard4i
            </a>{" "}
            · source on{" "}
            <a
              href="https://github.com/Gaspard4i/snack-and-catch"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              github.com/Gaspard4i/snack-and-catch
            </a>
            .
          </p>
          <p className="mt-2 text-muted text-xs">
            Unofficial Cobblemon companion. Not affiliated with Cobblemon, its
            authors, Nintendo, Game Freak or The Pokémon Company. All
            trademarks belong to their respective owners.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Data sources</h2>
        <p className="mt-1 text-xs text-muted">
          Every value shown on the site is traceable back to one of these.
        </p>
        <SourceList items={DATA_SOURCES} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Visual assets</h2>
        <SourceList items={ASSET_SOURCES} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t("api")}</h2>
        <p className="mt-2 text-sm text-muted">{t("apiIntro")}</p>
        <pre className="mt-3 rounded-lg border border-border bg-card p-4 overflow-x-auto text-xs font-mono">
          GET /api/recommend?pokemon=victini&amp;intent=spawn
        </pre>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t("pokemon")}</h2>
        <p className="mt-2 text-sm text-muted">{t("pokemonNotice")}</p>
      </section>
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-muted">…</div>}>
      <AboutContent />
    </Suspense>
  );
}
