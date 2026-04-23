import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

async function AboutContent() {
  const t = await getTranslations("about");
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 prose-invert">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("intro")}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t("sources")}</h2>
        <ul className="mt-3 space-y-3 text-sm">
          <li className="rounded-lg border border-border bg-card p-4">
            <div className="font-medium">Cobblemon</div>
            <div className="text-muted">
              MPL 2.0 ·{" "}
              <a
                href="https://gitlab.com/cable-mc/cobblemon"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                gitlab.com/cable-mc/cobblemon
              </a>
            </div>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <div className="font-medium">MysticMons</div>
            <div className="text-muted">
              MIT · addon Modrinth ·{" "}
              <a
                href="https://modrinth.com/datapack/mysticmons"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                modrinth.com/datapack/mysticmons
              </a>
            </div>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <div className="font-medium">Better Cobblemon Spawns</div>
            <div className="text-muted">
              MIT · addon Modrinth ·{" "}
              <a
                href="https://modrinth.com/mod/better-cobblemon-spawns"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                modrinth.com/mod/better-cobblemon-spawns
              </a>
            </div>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <div className="font-medium">Cobblemon Wiki</div>
            <div className="text-muted">
              CC BY 4.0 ·{" "}
              <a
                href="https://wiki.cobblemon.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                wiki.cobblemon.com
              </a>
            </div>
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t("api")}</h2>
        <p className="mt-2 text-sm text-muted">{t("apiIntro")}</p>
        <pre className="mt-3 rounded-lg border border-border bg-card p-4 overflow-x-auto text-xs font-mono">
          GET /api/recommend?pokemon=victini&amp;intent=spawn
        </pre>
      </section>

      <section className="mt-8">
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
