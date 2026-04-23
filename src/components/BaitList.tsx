import { getTranslations } from "next-intl/server";
import type { BaitRecommendation } from "@/lib/recommend/bait";

function prettifyItem(id: string): string {
  return id.replace(/^cobblemon:/, "").replace(/^minecraft:/, "").replaceAll("_", " ");
}

const KNOWN_REASONS = new Set([
  "shiny_reroll",
  "hidden_ability",
  "nature_boost",
  "level_boost",
  "baseline",
]);

export async function BaitList({ baits }: { baits: BaitRecommendation[] }) {
  const t = await getTranslations("pokemon");
  if (baits.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
        {t("baitsTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted">{t("baitsHelp")}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {baits.map((b) => (
          <li
            key={b.slug}
            className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3"
          >
            <span className="capitalize">{prettifyItem(b.itemId)}</span>
            <div className="flex flex-wrap justify-end gap-1">
              {b.reasons.map((r, i) => (
                <span
                  key={i}
                  className="text-[10px] rounded-full bg-subtle text-foreground px-2 py-0.5"
                >
                  {KNOWN_REASONS.has(r) ? t(`reason.${r}`) : r.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
