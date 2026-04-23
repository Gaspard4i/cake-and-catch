type Kind = "mod" | "wiki" | "derived" | "addon";

/**
 * Per-source palette. Each entry carries fg + bg with strong contrast so the
 * badge is readable on both light and dark themes. Unknown sources fall back
 * to a neutral zinc palette.
 */
const SOURCE_STYLES: Record<string, string> = {
  // Official mod.
  cobblemon:
    "bg-sky-500 text-white dark:bg-sky-600 dark:text-white",
  // Popular addons (Modrinth).
  mysticmons:
    "bg-fuchsia-600 text-white dark:bg-fuchsia-500 dark:text-white",
  "better-cobblemon-spawns":
    "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white",
  // Fallback kinds.
  wiki: "bg-amber-500 text-white dark:bg-amber-600 dark:text-white",
  derived:
    "bg-zinc-500 text-white dark:bg-zinc-400 dark:text-zinc-900",
};

function styleFor(kind: Kind, name?: string | null): string {
  if (name && SOURCE_STYLES[name]) return SOURCE_STYLES[name];
  if (kind === "wiki") return SOURCE_STYLES.wiki;
  if (kind === "derived") return SOURCE_STYLES.derived;
  // Unknown mod/addon: neutral zinc with a border for contrast.
  return "bg-zinc-600 text-white dark:bg-zinc-500 dark:text-white";
}

/**
 * Compact coloured badge identifying where a piece of data comes from.
 * Renders the source name (e.g. `cobblemon`, `mysticmons`) as a small pill.
 * Clickable when an `href` is provided.
 */
export function SourceBadge({
  kind,
  href,
  name,
  label,
}: {
  kind: Kind;
  href?: string;
  name?: string | null;
  /** Legacy override. When set, bypasses the name + palette logic. */
  label?: string;
}) {
  const text = label ?? name ?? kindDefaultText(kind);
  const cls = styleFor(kind, name);
  const content = (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${cls}`}
      title={name ? `${kind} · ${name}` : kind}
    >
      {text}
    </span>
  );
  if (!href) return content;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="hover:opacity-85">
      {content}
    </a>
  );
}

function kindDefaultText(kind: Kind): string {
  switch (kind) {
    case "wiki":
      return "wiki";
    case "derived":
      return "derived";
    case "addon":
      return "addon";
    case "mod":
    default:
      return "mod";
  }
}
