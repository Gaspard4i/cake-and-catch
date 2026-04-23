const TYPE_COLORS: Record<string, string> = {
  normal: "bg-zinc-400/20 text-zinc-800 dark:text-zinc-200",
  fire: "bg-orange-500/20 text-orange-800 dark:text-orange-300",
  water: "bg-sky-500/20 text-sky-800 dark:text-sky-300",
  electric: "bg-yellow-400/25 text-yellow-800 dark:text-yellow-300",
  grass: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300",
  ice: "bg-cyan-400/20 text-cyan-800 dark:text-cyan-300",
  fighting: "bg-red-700/25 text-red-900 dark:text-red-300",
  poison: "bg-fuchsia-500/20 text-fuchsia-800 dark:text-fuchsia-300",
  ground: "bg-amber-700/25 text-amber-900 dark:text-amber-300",
  flying: "bg-indigo-400/20 text-indigo-800 dark:text-indigo-300",
  psychic: "bg-pink-500/20 text-pink-800 dark:text-pink-300",
  bug: "bg-lime-600/25 text-lime-900 dark:text-lime-300",
  rock: "bg-stone-500/25 text-stone-900 dark:text-stone-300",
  ghost: "bg-violet-700/25 text-violet-900 dark:text-violet-300",
  dragon: "bg-indigo-700/25 text-indigo-900 dark:text-indigo-200",
  dark: "bg-zinc-800/40 text-zinc-900 dark:text-zinc-200",
  steel: "bg-slate-400/25 text-slate-900 dark:text-slate-200",
  fairy: "bg-rose-400/25 text-rose-900 dark:text-rose-300",
};

export function TypeBadge({ type, size = "sm" }: { type: string; size?: "sm" | "md" }) {
  const cls = TYPE_COLORS[type.toLowerCase()] ?? "bg-zinc-400/20 text-zinc-800 dark:text-zinc-200";
  const sizeCls =
    size === "md" ? "text-xs px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span className={`inline-flex items-center rounded-full font-medium capitalize ${cls} ${sizeCls}`}>
      {type}
    </span>
  );
}

export function TypePair({
  primary,
  secondary,
  size = "sm",
}: {
  primary: string;
  secondary?: string | null;
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex gap-1 flex-wrap">
      <TypeBadge type={primary} size={size} />
      {secondary && <TypeBadge type={secondary} size={size} />}
    </span>
  );
}
