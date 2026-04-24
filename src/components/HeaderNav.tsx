"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function HeaderNav() {
  const t = useTranslations("nav");
  return (
    <nav className="hidden sm:flex items-center gap-4 text-sm text-muted">
      <Link href="/pokedex" className="hover:text-foreground transition-colors">
        {t("pokedex")}
      </Link>
      <Link href="/snack" className="hover:text-foreground transition-colors">
        {t("cake")}
      </Link>
      <Link href="/juice" className="hover:text-foreground transition-colors">
        Juice
      </Link>
      <Link href="/docs/api" className="hover:text-foreground transition-colors">
        API
      </Link>
      <Link href="/about" className="hover:text-foreground transition-colors">
        {t("about")}
      </Link>
    </nav>
  );
}
