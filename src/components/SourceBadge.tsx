type Kind = "mod" | "wiki" | "derived" | "addon";

const labels: Record<Kind, string> = {
  mod: "Mod source",
  wiki: "Wiki",
  derived: "Déduit",
  addon: "Addon",
};

const styles: Record<Kind, string> = {
  mod: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  wiki: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  derived: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  addon: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function SourceBadge({
  kind,
  href,
  label,
}: {
  kind: Kind;
  href?: string;
  label?: string;
}) {
  const content = (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${styles[kind]}`}
    >
      {label ?? labels[kind]}
    </span>
  );
  if (!href) return content;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="hover:opacity-80">
      {content}
    </a>
  );
}
