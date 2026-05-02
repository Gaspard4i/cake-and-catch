import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Lightweight evolution chain rendered from the species' raw
 * Cobblemon JSON (`species.raw.evolutions[]`). It is intentionally
 * shallow — we only show the next-step targets of the current
 * species, not the full multi-stage tree. A future iteration can
 * walk the full tree by traversing each target's evolutions array
 * via additional DB lookups.
 *
 * Each evolution carries a `variant` (item_interact, level_up, …) and
 * usually a `requiredContext` or set of conditions; we keep the UI
 * minimal and surface the type of trigger as a small caption.
 */
type Evolution = {
  result?: string;
  variant?: string;
  requiredContext?: string;
};

function evolutionLabel(ev: Evolution): string | null {
  const variant = ev.variant ?? "";
  if (variant === "level_up") return "Level up";
  if (variant === "item_interact") {
    const ctx = ev.requiredContext ?? "";
    return ctx ? ctx.replace(/^[a-z0-9_]+:/, "").replace(/_/g, " ") : "Item";
  }
  if (variant === "trade") return "Trade";
  if (variant) return variant.replace(/_/g, " ");
  return null;
}

function targetSlug(result: string | undefined): string | null {
  if (!result) return null;
  return result
    .toLowerCase()
    .replace(/^[a-z0-9_]+:/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function EvolutionChain({
  speciesName,
  evolutions,
}: {
  speciesName: string;
  evolutions: Evolution[];
}) {
  if (!evolutions || evolutions.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {evolutions.map((ev, i) => {
        const slug = targetSlug(ev.result);
        const trigger = evolutionLabel(ev);
        const target = (ev.result ?? "").split(" ")[0];
        return (
          <li
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <span className="text-sm text-muted">{speciesName}</span>
            <ArrowRight className="size-4 text-muted" aria-hidden />
            {slug ? (
              <Link
                href={`/pokemon/${slug}`}
                className="text-sm font-medium underline decoration-dotted underline-offset-2 hover:text-accent capitalize"
              >
                {target.replace(/-/g, " ")}
              </Link>
            ) : (
              <span className="text-sm font-medium capitalize">{target}</span>
            )}
            {trigger && (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted">
                {trigger}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
