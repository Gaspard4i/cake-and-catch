"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type ThemeDef = {
  id: string;
  swatch: [string, string];
};

const THEMES: ThemeDef[] = [
  { id: "system", swatch: ["#fafaf9", "#0a0a0a"] },
  { id: "light", swatch: ["#fafaf9", "#2563eb"] },
  { id: "dark", swatch: ["#0a0a0a", "#60a5fa"] },
  { id: "pokecenter", swatch: ["#ffffff", "#e11d2a"] },
  { id: "grass", swatch: ["#e4f1db", "#2f8d3c"] },
  { id: "fire", swatch: ["#ffe6d2", "#e8591b"] },
  { id: "water", swatch: ["#d9ebf6", "#1e6fb8"] },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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

  const current = mounted ? THEMES.find((t) => t.id === theme) ?? THEMES[0] : THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label")}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-subtle transition-colors"
      >
        <span className="flex gap-0.5">
          <span
            className="size-3 rounded-full border border-border"
            style={{ background: current.swatch[0] }}
          />
          <span
            className="size-3 rounded-full -ml-1 border border-border"
            style={{ background: current.swatch[1] }}
          />
        </span>
        <span className="hidden sm:inline">{t(current.id)}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-48 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
        >
          {THEMES.map((themeDef) => {
            const active = themeDef.id === theme;
            return (
              <button
                key={themeDef.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setTheme(themeDef.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-subtle transition-colors ${
                  active ? "bg-subtle" : ""
                }`}
              >
                <span className="flex gap-0.5">
                  <span
                    className="size-4 rounded-full border border-border"
                    style={{ background: themeDef.swatch[0] }}
                  />
                  <span
                    className="size-4 rounded-full -ml-1.5 border border-border"
                    style={{ background: themeDef.swatch[1] }}
                  />
                </span>
                <span className="flex-1 text-left">{t(themeDef.id)}</span>
                {active && <span className="text-accent text-xs">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
