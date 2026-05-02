/**
 * Pokemon Showdown's `dex` sprite set is the most complete public
 * source of variant-aware portraits (mega, gmax, regional, cosmetic
 * forms, …). It uses a single slug convention:
 *
 *     {basename}[-{variant}]
 *
 * For our DB shape the basename is the species' base slug (e.g.
 * `vulpix`) and the variant is the `variantLabel` lower-cased and
 * normalised. Showdown spells "paldean" as "paldea" and uses
 * sub-form suffixes joined with `-` (`tauros-paldea-combat`,
 * `charizard-mega-x`, `urshifu-rapid-strike-gmax`).
 *
 * If Showdown 404s — which happens on a handful of niche cosmetics —
 * we fall back to the PokeAPI dex-numbered sprite (variant-blind but
 * reliably present for every species ID 1-1025).
 */
const VARIANT_NORMALIZE: Record<string, string> = {
  paldean: "paldea",
};

function variantSegment(variantLabel: string): string {
  return variantLabel
    .toLowerCase()
    .replace(/^([a-z]+)/, (m) => VARIANT_NORMALIZE[m] ?? m)
    .replace(/_/g, "-")
    .replace(/^-|-$/g, "");
}

function basenameSlug(name: string, baseSlug?: string | null): string {
  if (baseSlug) return baseSlug;
  return name
    .toLowerCase()
    .replace(/\s*\(.*\)\s*$/, "") // drop the "(alolan)" suffix we add at ingest
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function showdownSlug(opts: {
  name: string;
  baseSlug?: string | null;
  variantLabel?: string | null;
}): string {
  const base = basenameSlug(opts.name, opts.baseSlug ?? undefined);
  if (!opts.variantLabel) return base;
  return `${base}-${variantSegment(opts.variantLabel)}`;
}

export function spriteCandidates(opts: {
  dexNo: number;
  name: string;
  baseSlug?: string | null;
  variantLabel?: string | null;
  shiny?: boolean;
}): string[] {
  const slug = showdownSlug(opts);
  const shinyPath = opts.shiny ? "dex-shiny" : "dex";
  // Showdown serves both regular and shiny under matching slugs.
  const showdownPrimary = `https://play.pokemonshowdown.com/sprites/${shinyPath}/${slug}.png`;
  // PokeAPI fallback — dex-numbered, variant-blind. We hit shiny too
  // when applicable. dexNo is taken from the base species so this is
  // always reachable.
  const pokeApi = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${
    opts.shiny ? "shiny/" : ""
  }${opts.dexNo}.png`;
  return [showdownPrimary, pokeApi];
}
