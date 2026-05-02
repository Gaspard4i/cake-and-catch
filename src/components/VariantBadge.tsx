import { Sparkles, Maximize2, Gem, MapPin, Sparkle } from "lucide-react";

/**
 * Iconography for non-base Pokémon forms. We map each variant family
 * to a Lucide icon so the visual stays consistent across the app:
 *   - regional → MapPin (alolan/galarian/hisuian/paldean)
 *   - mega     → Sparkles (the "evolution" sparkle)
 *   - gmax     → Maximize2 (the gigantamax silhouette)
 *   - tera     → Gem (the Terastal crystal)
 *   - other    → Sparkle (cosmetic / mechanic forms)
 *
 * No remote sprite — keeps the app cheap and doesn't depend on a CDN
 * that might 404 on us (PokeAPI doesn't host gimmick logos and the
 * Bulbapedia ones are hot-link protected).
 */
const REGIONAL = ["alolan", "galarian", "hisuian", "paldean"];

function family(variantLabel: string): "regional" | "mega" | "gmax" | "tera" | "other" {
  const v = variantLabel.toLowerCase();
  if (v.startsWith("mega")) return "mega";
  if (v.startsWith("gmax")) return "gmax";
  if (v.startsWith("tera") || v.endsWith("-tera")) return "tera";
  for (const r of REGIONAL) if (v.startsWith(r)) return "regional";
  return "other";
}

const STYLES: Record<ReturnType<typeof family>, { bg: string; text: string; Icon: typeof Sparkles; label: string }> = {
  regional: {
    bg: "bg-emerald-500",
    text: "text-white",
    Icon: MapPin,
    label: "Regional form",
  },
  mega: { bg: "bg-purple-500", text: "text-white", Icon: Sparkles, label: "Mega evolution" },
  gmax: { bg: "bg-rose-500", text: "text-white", Icon: Maximize2, label: "Gigantamax" },
  tera: { bg: "bg-cyan-500", text: "text-white", Icon: Gem, label: "Terastal" },
  other: { bg: "bg-slate-500", text: "text-white", Icon: Sparkle, label: "Alt form" },
};

/**
 * Notification-style badge anchored to the top-right of its container.
 * The parent must be `position: relative` for the absolute positioning
 * to land in the right place. Sized to NOT affect the surrounding
 * layout — that's the rule the Cobbledex card needs.
 */
export function VariantBadge({
  variantLabel,
  className = "",
  inline = false,
}: {
  variantLabel?: string | null;
  className?: string;
  /**
   * When true the badge renders inline with the surrounding text
   * (used next to the species name on the species page). When false
   * it floats to the top-right of the parent — the card layout.
   */
  inline?: boolean;
}) {
  if (!variantLabel) return null;
  const fam = family(variantLabel);
  const { bg, text, Icon, label } = STYLES[fam];
  const title = `${label}: ${variantLabel.replace(/_/g, " ")}`;

  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${bg} ${text} ${className}`}
        title={title}
      >
        <Icon className="size-3" aria-hidden />
        <span>{variantLabel.replace(/_/g, " ")}</span>
      </span>
    );
  }

  return (
    <span
      className={`absolute -top-1 -right-1 z-10 inline-flex items-center justify-center rounded-full size-6 shadow-sm border border-background ${bg} ${text} ${className}`}
      title={title}
      aria-label={title}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
