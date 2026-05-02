/**
 * Compact tag rendered next to a Pokémon name when it's a non-base
 * form. The colour is keyed off the variant family so the player can
 * spot Megas / Gmax / Regionals at a glance, with a fallback for the
 * cosmetic and mechanic forms (drives, plates, costumes…).
 */
const REGIONAL = new Set(["alolan", "galarian", "hisuian", "paldean"]);

function family(variantLabel: string): "regional" | "mega" | "gmax" | "tera" | "other" {
  const v = variantLabel.toLowerCase();
  if (v.startsWith("mega")) return "mega";
  if (v.startsWith("gmax")) return "gmax";
  if (v.startsWith("tera") || v.endsWith("-tera")) return "tera";
  for (const r of REGIONAL) if (v.startsWith(r)) return "regional";
  return "other";
}

const STYLES: Record<ReturnType<typeof family>, string> = {
  regional: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  mega: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  gmax: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  tera: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  other: "bg-subtle text-muted border-border",
};

export function VariantBadge({
  variantLabel,
  className = "",
}: {
  variantLabel?: string | null;
  className?: string;
}) {
  if (!variantLabel) return null;
  const fam = family(variantLabel);
  return (
    <span
      className={`inline-flex items-center text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border font-medium ${STYLES[fam]} ${className}`}
      title={`Variant: ${variantLabel}`}
    >
      {variantLabel.replace(/_/g, " ")}
    </span>
  );
}
