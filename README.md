# Cake & Catch

Assistant Cobblemon : recettes de cuisine + spots de spawn par Pokémon. Données extraites du [repo officiel Cobblemon](https://gitlab.com/cable-mc/cobblemon) (MPL 2.0) et du [wiki officiel](https://wiki.cobblemon.com) (CC BY 4.0).

## Stack

- Next.js 16 (App Router, Cache Components / PPR) + React 19
- Tailwind CSS 4
- PostgreSQL (local via Docker, Neon en prod)
- Drizzle ORM + Zod
- Vitest

## Setup local

```sh
pnpm install
docker compose up -d           # Postgres sur :5433
pnpm db:migrate                # applique le schéma
pnpm ingest                    # clone repo Cobblemon → DB (~30s, ~3000 spawns)
pnpm dev                       # http://localhost:3000
```

## Scripts

- `pnpm dev` — Next dev (Turbopack)
- `pnpm build` — build prod
- `pnpm test` — Vitest
- `pnpm db:generate` — génère migrations Drizzle depuis le schéma
- `pnpm db:migrate` — applique migrations
- `pnpm ingest` — pipeline d'ingestion des données Cobblemon

## Arborescence

```
src/
  app/                       routes App Router
    pokemon/[slug]/          fiche Pokémon
    search/                  recherche
  components/                UI components
  lib/
    db/                      Drizzle client + schéma + queries
    parsers/                 Zod pour JSON Cobblemon
    sources/                 fetchers (GitLab, plus tard wiki)
    recommend/               (Phase 2) moteur de recommandation
ingest/
  run.ts                     orchestrateur du pipeline
tests/
  fixtures/                  JSON réels pour tests parsers
drizzle/                     migrations SQL
```

## Phase actuelle

Phase 1 — fondations : ingestion species + spawns, fiche Pokémon en lecture seule avec badges de source. ~1025 espèces, ~2827 spawns indexés.
