"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChefHat, FlaskRound, Home, Info, Leaf, Search, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** id the <nav> can reference via aria-controls. */
  id?: string;
  /** Show /debug link (dev / preview). */
  showDebug?: boolean;
};

/**
 * Bottom-sheet dialog shown when the user taps "More" in MobileBottomNav.
 * Contains secondary destinations: Home, Search, About. Locale and theme
 * remain in the top header — duplicating them here would add no
 * discoverability and cost extra taps to undo a wrong choice.
 *
 * Accessibility:
 *   - role=dialog + aria-modal=true
 *   - Focus returns to trigger on close (handled by the parent via a ref
 *     it holds on the "More" button)
 *   - Esc closes
 *   - Body scroll lock while open
 *   - Respects prefers-reduced-motion (skips the slide-in translate)
 */
export function MoreSheet({ open, onClose, id, showDebug = false }: Props) {
  const t = useTranslations("nav");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Move initial focus inside the panel for keyboard users.
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  const items: Array<{ href: string; label: string; Icon: typeof Home }> = [
    { href: "/", label: t("home"), Icon: Home },
    { href: "/search", label: t("search"), Icon: Search },
    { href: "/seasonings", label: t("seasonings"), Icon: Leaf },
    { href: "/saved", label: t("savedRecipes"), Icon: ChefHat },
    { href: "/about", label: t("about"), Icon: Info },
  ];
  if (showDebug) {
    items.push({ href: "/debug", label: "Debug", Icon: FlaskRound });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={id ? `${id}-title` : undefined}
      className="sm:hidden fixed inset-0 z-[60]"
    >
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-[fade-in_120ms_ease-out]"
      />
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card shadow-2xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] motion-safe:animate-[slide-up_180ms_cubic-bezier(.2,.7,.2,1)]"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-border mb-3" aria-hidden />
        <div className="flex items-center justify-between mb-3">
          <h2
            id={id ? `${id}-title` : undefined}
            className="text-xs uppercase tracking-widest text-muted"
          >
            {t("more")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="size-10 -mr-2 flex items-center justify-center rounded-full hover:bg-subtle"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-1">
          {items.map(({ href, label, Icon }) => (
            <li key={href}>
              <PathLink
                href={href}
                onNavigate={onClose}
                className="flex items-center gap-3 min-h-12 px-3 rounded-lg hover:bg-subtle active:bg-subtle/80"
              >
                <Icon className="h-5 w-5 text-muted" aria-hidden />
                <span className="text-sm">{label}</span>
              </PathLink>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>,
    document.body,
  );
}

/** Link that fires onNavigate on click, used to close the sheet on tap. */
function PathLink({
  href,
  onNavigate,
  className,
  children,
}: {
  href: string;
  onNavigate: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${className ?? ""} ${active ? "bg-subtle" : ""}`}
    >
      {children}
    </Link>
  );
}
