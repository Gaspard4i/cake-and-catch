"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function HeaderNav() {
  const t = useTranslations("nav");
  return (
    <nav className="hidden sm:flex items-center gap-4 text-sm text-muted">
      <Link href="/" className="hover:text-foreground transition-colors">
        {t("pokedex")}
      </Link>
      <Link href="/recipes" className="hover:text-foreground transition-colors">
        {t("recipes")}
      </Link>
      <Link href="/about" className="hover:text-foreground transition-colors">
        {t("about")}
      </Link>
    </nav>
  );
}
