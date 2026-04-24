"use client";

import { Egg, Heart, Sparkles, Star, Venus, Mars } from "lucide-react";
import type { FormattedBaitEffect } from "@/lib/recommend/bait-effects";

/**
 * Iconic one-line summary of every effect the currently-loaded snack has.
 * No per-effect colour noise — just a compact wrap of symbols + labels.
 *
 * Conventions:
 *   - `shiny_reroll` → gold star
 *   - `typing` → PokéAPI type icon served from /textures/type/<type>.png
 *   - `ev` / `iv` / `nature` → stat icon + signed value or nature badge
 *   - `egg_group` → pokéball glyph + egg group name
 *   - `ha_chance` → DNA glyph + "hidden ability"
 *   - `gender_chance` → ♀ / ♂
 *   - `bite_time`, `rarity_bucket`, `level_raise`, `friendship`,
 *     `drops_reroll`, `mark_chance` → plain text tag
 */

type Props = { effects: FormattedBaitEffect[] };

const STAT_LABEL: Record<string, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spa: "Sp.ATK",
  spd: "Sp.DEF",
  spe: "Spe",
  speed: "Spe",
};

/**
 * Nature groups per stat subcategory, matching SpawnBaitInfluence semantics
 * (the mod picks a random nature whose `increasedStat == subcategory`).
 */
const NATURES_BY_STAT: Record<string, string[]> = {
  atk: ["Lonely", "Adamant", "Naughty", "Brave"],
  def: ["Bold", "Impish", "Lax", "Relaxed"],
  spa: ["Modest", "Mild", "Rash", "Quiet"],
  spd: ["Calm", "Gentle", "Careful", "Sassy"],
  spe: ["Timid", "Hasty", "Jolly", "Naive"],
  speed: ["Timid", "Hasty", "Jolly", "Naive"],
};

function pctLabel(chance: number): string {
  if (chance >= 1) return "";
  return `${Math.round(chance * 100)}%`;
}

function TypeIcon({ type }: { type: string }) {
  // Plain <img>: height-driven aspect ratio, native width. Using Next's
  // Image here would emit a single-axis override warning because we only
  // fix height and let width flow.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/textures/type/${type}.png`}
      alt={type}
      className="inline-block align-middle h-[18px] w-auto"
    />
  );
}

function StatPill({ stat }: { stat: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md border border-border bg-subtle px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold tabular-nums">
      {STAT_LABEL[stat] ?? stat.toUpperCase()}
    </span>
  );
}

function Chip({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs"
      title={title}
    >
      {children}
    </span>
  );
}

function renderEffect(e: FormattedBaitEffect, i: number): React.ReactNode {
  const chance = pctLabel(e.chance);
  switch (e.kind) {
    case "shiny_reroll":
      return (
        <Chip key={i} title={e.description}>
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" aria-hidden />
          <span>×{e.value || 1}</span>
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    case "typing":
      return (
        <Chip key={i} title={e.description}>
          <TypeIcon type={e.subcategory} />
          <span className="text-muted">×{e.value || 10}</span>
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    case "ev":
      return (
        <Chip key={i} title={e.description}>
          <span className="text-muted text-[10px] uppercase">EV</span>
          <StatPill stat={e.subcategory} />
        </Chip>
      );
    case "iv":
      return (
        <Chip key={i} title={e.description}>
          <StatPill stat={e.subcategory} />
          <span className="font-mono">
            IV +{e.value}
          </span>
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    case "nature": {
      const natures = NATURES_BY_STAT[e.subcategory] ?? [];
      return (
        <Chip key={i} title={e.description}>
          <span className="text-muted text-[10px] uppercase">Nature</span>
          <StatPill stat={e.subcategory} />
          {natures.length > 0 && (
            <span className="text-muted text-[10px]">
              {natures.join(" / ")}
            </span>
          )}
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    }
    case "egg_group":
      return (
        <Chip key={i} title={e.description}>
          <Egg className="h-3.5 w-3.5 text-muted" aria-hidden />
          <span className="capitalize">
            {e.subcategory.replace(/_/g, " ")}
          </span>
          <span className="text-muted">×{e.value || 10}</span>
        </Chip>
      );
    case "ha_chance":
      return (
        <Chip key={i} title={e.description}>
          <span className="text-[10px] uppercase tracking-wide text-accent font-semibold">
            HA
          </span>
          <span className="text-muted">Hidden ability</span>
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    case "gender_chance":
      return (
        <Chip key={i} title={e.description}>
          {e.subcategory === "female" ? (
            <Venus className="h-3.5 w-3.5 text-pink-500" aria-hidden />
          ) : (
            <Mars className="h-3.5 w-3.5 text-sky-500" aria-hidden />
          )}
          <span className="capitalize">{e.subcategory}</span>
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    case "rarity_bucket":
      return (
        <Chip key={i} title={e.description}>
          <span className="text-muted text-[10px] uppercase">Rarity</span>
          <span>+{e.value} tier</span>
        </Chip>
      );
    case "bite_time":
      return (
        <Chip key={i} title={e.description}>
          <span className="text-muted text-[10px] uppercase">Bite</span>
          <span>−{Math.round(e.value * 100)}%</span>
        </Chip>
      );
    case "level_raise":
      return (
        <Chip key={i} title={e.description}>
          <span className="text-muted text-[10px] uppercase">Lv</span>
          <span>+{e.value}</span>
        </Chip>
      );
    case "friendship":
      return (
        <Chip key={i} title={e.description}>
          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" aria-hidden />
          <span>+{e.value}</span>
        </Chip>
      );
    case "drops_reroll":
      return (
        <Chip key={i} title={e.description}>
          <span className="text-muted text-[10px] uppercase">Drops</span>
          <span>reroll ×{e.value || 1}</span>
        </Chip>
      );
    case "mark_chance":
      return (
        <Chip key={i} title={e.description}>
          <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          <span>Mark chance</span>
          {chance && <span className="text-muted">{chance}</span>}
        </Chip>
      );
    default:
      return (
        <Chip key={i} title={e.description}>
          <span>{e.title}</span>
        </Chip>
      );
  }
}

export function SnackEffectsSummary({ effects }: Props) {
  if (effects.length === 0) {
    return (
      <p className="text-sm text-muted">Drop a bait seasoning to see its effects.</p>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-wrap gap-2">
      {effects.map((e, i) => renderEffect(e, i))}
    </div>
  );
}
