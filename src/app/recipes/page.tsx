import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listCoreRecipes } from "@/lib/db/queries";
import { RecipeGrid } from "@/components/RecipeGrid";
import type { GridCell } from "@/lib/parsers/recipe";

function prettifyItem(id: string): string {
  return id.replace(/^cobblemon:|^minecraft:/, "").replaceAll("_", " ");
}

async function RecipesList() {
  const [t, recipes] = await Promise.all([getTranslations("recipes"), listCoreRecipes()]);

  const byKind = new Map<string, typeof recipes>();
  for (const r of recipes) {
    const arr = byKind.get(r.kind) ?? [];
    arr.push(r);
    byKind.set(r.kind, arr);
  }

  const ORDER = ["cake", "bait", "snack", "aprijuice"] as const;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted max-w-2xl">{t("intro")}</p>

      {ORDER.map((kind) => {
        const list = byKind.get(kind) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={kind} className="mt-10">
            <h2 className="text-lg font-semibold">{t(`kinds.${kind}`)}</h2>
            <p className="mt-1 text-sm text-muted">{t(`kindsHelp.${kind}`)}</p>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {list.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4"
                >
                  <div>
                    <h3 className="font-medium capitalize">{prettifyItem(r.resultId)}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {r.shape === "shaped" ? t("shaped") : t("shapeless")} · ×{r.resultCount}
                    </p>
                  </div>
                  {r.shape === "shaped" && (
                    <RecipeGrid
                      grid={r.grid as GridCell[][]}
                      seasoningSlot={Boolean(r.seasoningTag)}
                    />
                  )}
                  {r.shape === "shapeless" && Array.isArray(r.ingredients) && (
                    <ul className="flex flex-wrap gap-1.5 text-xs">
                      {(r.ingredients as Array<{ item?: string; tag?: string }>).map(
                        (ing, i) => (
                          <li
                            key={i}
                            className="rounded-md border border-border bg-subtle px-2 py-1 capitalize"
                          >
                            {ing.item
                              ? prettifyItem(ing.item)
                              : `#${prettifyItem(ing.tag ?? "")}`}
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                  {r.seasoningTag && (
                    <div className="text-xs text-muted">
                      {t("seasoningTag")}:{" "}
                      <span className="font-mono">{r.seasoningTag}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export default function RecipesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Suspense fallback={<p className="text-sm text-muted">…</p>}>
        <RecipesList />
      </Suspense>
    </div>
  );
}
