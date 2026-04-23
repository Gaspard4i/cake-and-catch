type Kind = "mod" | "wiki" | "derived" | "addon";

const labels: Record<Kind, string> = {
  mod: "mod source",
  wiki: "wiki",
  derived: "derived",
  addon: "addon",
};

const styles: Record<Kind, string> = {
  mod: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  wiki: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  derived: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  addon: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

/**
 * Informative, non-interactive badge that shows the provenance of a piece of
 * data. For `mod` / `addon` a `name` can be passed — rendered as
 *   `<kind> : <name>`
 * so the reader sees exactly which mod/addon the data came from.
 *
 * `href` makes the badge a link (opens the source in a new tab).
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
  /** Legacy override — bypasses kind+name composition. */
  label?: string;
}) {
  const text =
    label ?? (name ? `${labels[kind]} : ${name}` : labels[kind]);
  const content = (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${styles[kind]}`}
    >
      {text}
    </span>
  );
  if (!href) return content;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="hover:opacity-80"
      title={text}
    >
      {content}
    </a>
  );
}
