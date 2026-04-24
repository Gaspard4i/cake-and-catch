"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/config";

const LOCALES: { id: Locale; flag: string }[] = [
  { id: "en", flag: "EN" },
  { id: "fr", flag: "FR" },
  { id: "es", flag: "ES" },
  { id: "de", flag: "DE" },
  { id: "pt", flag: "PT" },
  { id: "ja", flag: "JA" },
  { id: "zh", flag: "ZH" },
];

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const current = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label")}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-subtle transition-colors"
      >
        {LOCALES.find((l) => l.id === current)?.flag ?? current.toUpperCase()}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-40 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
        >
          {LOCALES.map((l) => {
            const active = l.id === current;
            return (
              <button
                key={l.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  startTransition(() => {
                    setLocale(l.id);
                  });
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-subtle transition-colors ${
                  active ? "bg-subtle" : ""
                }`}
              >
                <span>{t(l.id)}</span>
                <span className="text-xs text-muted font-mono">{l.flag}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
