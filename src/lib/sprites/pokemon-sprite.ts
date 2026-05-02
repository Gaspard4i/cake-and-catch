/**
 * Sprite cascade for every Pokémon — base or variant.
 *
 * 1. **cobblemon.tools** is the primary source. They run a public
 *    pre-render of the actual Cobblemon 3D models into frozen 2D
 *    portraits at `/pokedex/pokemon/<slug>/sprite.png`. Because those
 *    images come from Cobblemon's own assets, they're visually
 *    consistent with the rest of the companion-app ecosystem.
 *
 *    cobblemon.tools strips the `-n` suffix from regional aspects:
 *    `alolan` → `alola`, `galarian` → `galar`, `hisuian` → `hisui`,
 *    `paldean` → `paldea`. Everything else (mega-x, gmax, …) is
 *    passed through verbatim.
 *
 * 2. **Pokemon Showdown's `dex` set** as fallback for variants the
 *    Cobblemon roster doesn't ship yet (cosmetic / Paradox forms,
 *    every-now-and-then late additions).
 *
 * 3. **PokeAPI sprites** by dex number — variant-blind but covers
 *    every species. Last network resort.
 *
 * 4. **Silhouette badge** rendered in the component itself.
 */
const REGIONAL_REWRITES: Record<string, string> = {
  alolan: "alola",
  galarian: "galar",
  hisuian: "hisui",
  paldean: "paldea",
};

function variantSegment(variantLabel: string, target: "cobblemon" | "showdown"): string {
  const v = variantLabel.toLowerCase().replace(/_/g, "-").replace(/^-|-$/g, "");
  if (target === "cobblemon") {
    return v.replace(
      /^([a-z]+)/,
      (m) => REGIONAL_REWRITES[m] ?? m,
    );
  }
  // Showdown sticks with `paldea` for paldean too — same rewrite,
  // narrower scope in practice.
  return v.replace(/^paldean/, "paldea");
}

function basenameSlug(name: string, baseSlug?: string | null): string {
  if (baseSlug) return baseSlug;
  return name
    .toLowerCase()
    .replace(/\s*\(.*\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cobblemonToolsSlug(opts: {
  name: string;
  baseSlug?: string | null;
  variantLabel?: string | null;
}): string {
  const base = basenameSlug(opts.name, opts.baseSlug ?? undefined);
  if (!opts.variantLabel) return base;
  return `${base}-${variantSegment(opts.variantLabel, "cobblemon")}`;
}

export function showdownSlug(opts: {
  name: string;
  baseSlug?: string | null;
  variantLabel?: string | null;
}): string {
  const base = basenameSlug(opts.name, opts.baseSlug ?? undefined);
  if (!opts.variantLabel) return base;
  return `${base}-${variantSegment(opts.variantLabel, "showdown")}`;
}

export function spriteCandidates(opts: {
  dexNo: number;
  name: string;
  baseSlug?: string | null;
  variantLabel?: string | null;
  shiny?: boolean;
}): string[] {
  const cobble = cobblemonToolsSlug(opts);
  const sd = showdownSlug(opts);
  const shinyPath = opts.shiny ? "dex-shiny" : "dex";
  const out: string[] = [];

  // 1. Cobblemon-rendered portrait of the exact form.
  out.push(`https://cobblemon.tools/pokedex/pokemon/${cobble}/sprite.png`);

  // 2. If we asked for a variant and Cobblemon doesn't have it yet,
  //    fall back to the base species' Cobblemon portrait so the
  //    visual stays in the Cobblemon style instead of jumping to
  //    Showdown's pixel art.
  if (opts.variantLabel) {
    const base = basenameSlug(opts.name, opts.baseSlug ?? undefined);
    if (base && base !== cobble) {
      out.push(`https://cobblemon.tools/pokedex/pokemon/${base}/sprite.png`);
    }
  }

  // 3. Pokemon Showdown variant-aware pixel sprite.
  out.push(`https://play.pokemonshowdown.com/sprites/${shinyPath}/${sd}.png`);

  // 4. PokeAPI dex-number fallback (variant-blind).
  out.push(
    `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${
      opts.shiny ? "shiny/" : ""
    }${opts.dexNo}.png`,
  );

  // 5. PokeAPI official artwork — last network attempt before the
  //    silhouette badge. Higher resolution but always available.
  out.push(
    `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${opts.dexNo}.png`,
  );

  return out;
}
