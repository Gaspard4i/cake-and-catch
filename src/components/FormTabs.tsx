import Link from "next/link";

/**
 * Inline navigation between every form of a Pokémon — base, regional,
 * mega, gmax, cosmetic. Rendered at the top of the species page when
 * the family has more than one entry.
 *
 * The component is server-side and consumes the result of
 * `listFormsOfBase()`. It's stateless: clicking a form navigates to
 * `/pokemon/[slug]` like any other link.
 */
export function FormTabs({
  forms,
  currentSlug,
}: {
  forms: Array<{
    slug: string;
    name: string;
    variantLabel: string | null;
    isBase: boolean;
  }>;
  currentSlug: string;
}) {
  if (forms.length <= 1) return null;
  return (
    <nav
      aria-label="Pokémon forms"
      className="mt-3 -mx-1 flex flex-wrap items-center gap-1"
    >
      {forms.map((f) => {
        const active = f.slug === currentSlug;
        const label = f.isBase ? "Base" : (f.variantLabel ?? "Form").replace(/_/g, " ");
        return (
          <Link
            key={f.slug}
            href={`/pokemon/${f.slug}`}
            aria-current={active ? "page" : undefined}
            className={`text-xs px-2 py-1 rounded-md border transition-colors capitalize ${
              active
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
