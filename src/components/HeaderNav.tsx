"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function HeaderNav({ showDebug = false }: { showDebug?: boolean }) {
  const t = useTranslations("nav");
  return (
    <nav className="hidden sm:flex items-center gap-4 text-sm text-muted">
      <Link href="/pokedex" className="hover:text-foreground transition-colors">
        {t("pokedex")}
      </Link>
      <Link href="/seasonings" className="hover:text-foreground transition-colors">
        {t("seasonings")}
      </Link>
      <Link href="/snack" className="hover:text-foreground transition-colors">
        {t("cake")}
      </Link>
      <Link href="/bait" className="hover:text-foreground transition-colors">
        {t("bait")}
      </Link>
      <Link href="/juice" className="hover:text-foreground transition-colors">
        {t("juice")}
      </Link>
      <Link href="/about" className="hover:text-foreground transition-colors">
        {t("about")}
      </Link>
      {showDebug && (
        <Link
          href="/debug"
          className="text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-wide text-[11px]"
        >
          debug
        </Link>
      )}
    </nav>
  );
}
