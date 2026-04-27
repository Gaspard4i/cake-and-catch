"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ItemIcon } from "../ItemIcon";
import { Skeleton } from "../Loader";

type Berry = {
  slug: string;
  itemId: string;
  flavours?: Record<string, number | undefined>;
  dominantFlavour?: string | null;
};

type Props = {
  berries: Berry[];
  loading: boolean;
  ownedBerries: Set<string>;
  onToggle: (slug: string) => void;
  onSelectAll: () => void;

  /** Search box (managed by parent so the same query persists across modes). */
  filter: string;
  onFilterChange: (q: string) => void;

  /** Active flavour filter (parent-managed). */
  activeFlavours: Set<string>;
  onToggleFlavour: (flavour: string) => void;
  onClearFlavours: () => void;
  flavoursAll: readonly string[];
  flavourColors: Record<string, string>;

  /** Derived list already filtered by parent (search + flavour). */
  filteredBerries: Berry[];
};

/**
 * Owned-berries picker with two faces:
 *   - inline grid on sm: and up (the original UX, untouched)
 *   - mobile-only CTA that opens a full-screen sheet with chunky tap
 *     targets, sticky filter bar, "select all / clear" controls, and a
 *     close button. Both faces share the same parent state, so toggling
 *     in the modal reflects instantly when the user dismisses it.
 */
export function OwnedBerriesPicker(props: Props) {
  const t = useTranslations("juice");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const {
    berries,
    loading,
    ownedBerries,
    onToggle,
    onSelectAll,
    filter,
    onFilterChange,
    activeFlavours,
    onToggleFlavour,
    onClearFlavours,
    flavoursAll,
    flavourColors,
    filteredBerries,
  } = props;

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs uppercase tracking-wide text-muted">
          {t("ownedBerries")}{" "}
          <span className="ml-1 normal-case text-muted">
            ({ownedBerries.size}/{berries.length})
          </span>
        </h4>
        <div className="hidden sm:flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={t("filterBerries")}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs w-40"
          />
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border border-border text-muted hover:text-foreground"
          >
            {ownedBerries.size === berries.length ? tc("clear") : t("selectAll")}
          </button>
        </div>
      </div>

      {/* Mobile CTA → full-screen sheet. Desktop sees the inline grid below. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-left flex items-center justify-between hover:bg-subtle"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">{t("ownedBerries")}</div>
          <div className="text-[11px] text-muted truncate">
            {ownedBerries.size} / {berries.length}
          </div>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-accent shrink-0">
          {ownedBerries.size === 0 ? "Pick" : "Edit"}
        </span>
      </button>

      {/* Inline flavour filter (desktop only — modal has its own). */}
      <div
        className="hidden sm:flex mt-2 flex-wrap gap-1"
        role="group"
        aria-label={t("flavourFilter")}
      >
        {flavoursAll.map((f) => (
          <FlavourChip
            key={f}
            label={f}
            active={activeFlavours.has(f)}
            color={flavourColors[f]}
            onClick={() => onToggleFlavour(f)}
          />
        ))}
        {activeFlavours.size > 0 && (
          <button
            type="button"
            onClick={onClearFlavours}
            className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
          >
            {tc("clear")}
          </button>
        )}
      </div>

      {/* Inline grid (desktop only). Mobile uses the modal. */}
      <div className="hidden sm:block">
        {loading && berries.length === 0 ? (
          <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-border p-2 bg-subtle">
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1">
              {filteredBerries.map((b) => {
                const active = ownedBerries.has(b.slug);
                return (
                  <li key={b.slug}>
                    <button
                      type="button"
                      onClick={() => onToggle(b.slug)}
                      aria-pressed={active}
                      className={`w-full flex items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors ${
                        active ? "bg-card" : "opacity-40 hover:opacity-70"
                      }`}
                      title={b.slug}
                    >
                      <ItemIcon id={b.itemId} size={20} />
                      <span className="text-[11px] truncate capitalize flex-1">
                        {b.slug.replaceAll("_", " ")}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredBerries.length === 0 && (
                <li className="col-span-full text-center text-xs text-muted py-2">
                  {t("noBerry")}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <BerriesSheet
        open={open}
        onClose={() => setOpen(false)}
        loading={loading}
        berries={berries}
        ownedBerries={ownedBerries}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
        filter={filter}
        onFilterChange={onFilterChange}
        activeFlavours={activeFlavours}
        onToggleFlavour={onToggleFlavour}
        onClearFlavours={onClearFlavours}
        flavoursAll={flavoursAll}
        flavourColors={flavourColors}
        filteredBerries={filteredBerries}
      />
    </>
  );
}

function FlavourChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors"
      style={
        active
          ? {
              background: `${color}33`,
              borderColor: color,
              color,
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}

function BerriesSheet({
  open,
  onClose,
  loading,
  berries,
  ownedBerries,
  onToggle,
  onSelectAll,
  filter,
  onFilterChange,
  activeFlavours,
  onToggleFlavour,
  onClearFlavours,
  flavoursAll,
  flavourColors,
  filteredBerries,
}: {
  open: boolean;
  onClose: () => void;
} & Omit<Props, "loading"> & { loading: boolean }) {
  const t = useTranslations("juice");
  const tc = useTranslations("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Body scroll-lock + Esc to close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ownedBerries")}
      className="sm:hidden fixed inset-0 z-[80] flex flex-col bg-background"
    >
      {/* Header (sticky) — search, count, close. */}
      <div className="border-b border-border bg-card pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold tracking-tight truncate">
              {t("ownedBerries")}
            </h2>
            <p className="text-[11px] text-muted">
              {ownedBerries.size} / {berries.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] uppercase tracking-wide px-2.5 py-1.5 rounded-md border border-border hover:bg-subtle"
          >
            {ownedBerries.size === berries.length ? tc("clear") : t("selectAll")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-10 -mr-1 flex items-center justify-center rounded-full hover:bg-subtle"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="px-4 pb-3">
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={t("filterBerries")}
            className="w-full rounded-md border border-border bg-subtle px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div
          className="px-4 pb-3 flex flex-wrap gap-1"
          role="group"
          aria-label={t("flavourFilter")}
        >
          {flavoursAll.map((f) => (
            <FlavourChip
              key={f}
              label={f}
              active={activeFlavours.has(f)}
              color={flavourColors[f]}
              onClick={() => onToggleFlavour(f)}
            />
          ))}
          {activeFlavours.size > 0 && (
            <button
              type="button"
              onClick={onClearFlavours}
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
            >
              {tc("clear")}
            </button>
          )}
        </div>
      </div>

      {/* List — chunky cells, double column. */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+88px)]">
        {loading && berries.length === 0 ? (
          <ul className="grid grid-cols-2 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
          </ul>
        ) : filteredBerries.length === 0 ? (
          <p className="text-center text-sm text-muted py-10">{t("noBerry")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {filteredBerries.map((b) => {
              const active = ownedBerries.has(b.slug);
              return (
                <li key={b.slug}>
                  <button
                    type="button"
                    onClick={() => onToggle(b.slug)}
                    aria-pressed={active}
                    className={`relative w-full min-h-16 flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-accent bg-card"
                        : "border-border bg-subtle text-muted"
                    }`}
                  >
                    <ItemIcon id={b.itemId} size={36} />
                    <span className="text-sm capitalize flex-1 leading-tight break-words">
                      {b.slug.replaceAll("_", " ")}
                    </span>
                    {active && (
                      <Check
                        className="h-4 w-4 text-accent shrink-0"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sticky bottom action — confirm and dismiss. */}
      <div className="border-t border-border bg-card px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-accent text-accent-foreground px-4 py-3 text-sm font-medium hover:opacity-90"
        >
          Done · {ownedBerries.size} selected
        </button>
      </div>
    </div>,
    document.body,
  );
}
