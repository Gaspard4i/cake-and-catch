"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Cookie, FlaskConical, Library, Menu } from "lucide-react";
import { MoreSheet } from "./MoreSheet";

type Tab = {
  href: string;
  labelKey: "pokedex" | "snack" | "juice";
  Icon: typeof Library;
};

const TABS: Tab[] = [
  { href: "/pokedex", labelKey: "pokedex", Icon: Library },
  { href: "/snack", labelKey: "snack", Icon: Cookie },
  { href: "/juice", labelKey: "juice", Icon: FlaskConical },
];

/**
 * Sticky bottom tab bar shown on phones only. Tablets and up use the
 * inline HeaderNav. Rendered as a <nav> so assistive tech announces it as
 * primary navigation; each tab carries aria-current="page" when the
 * pathname matches.
 *
 * iOS safe-area: the fixed bar extends into the home-indicator zone via
 * `pb-[env(safe-area-inset-bottom)]`. Pair with
 * `viewport: { viewportFit: "cover" }` on layout.tsx so the inset is
 * actually exposed.
 */
export function MobileBottomNav({ showDebug = false }: { showDebug?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetId = useId();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <nav
        aria-label={t("primary")}
        className="sm:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto max-w-5xl grid grid-cols-4 h-14">
          {TABS.map(({ href, labelKey, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href} className="contents">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-2 touch-manipulation transition-colors ${
                    active ? "text-accent" : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    aria-hidden
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className="text-[10px] leading-none tracking-wide">
                    {t(labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="contents">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={sheetId}
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-2 touch-manipulation transition-colors ${
                moreOpen ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <Menu
                className="h-[22px] w-[22px]"
                aria-hidden
                strokeWidth={moreOpen ? 2.5 : 2}
              />
              <span className="text-[10px] leading-none tracking-wide">
                {t("more")}
              </span>
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet
        id={sheetId}
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        showDebug={showDebug}
      />
    </>
  );
}
