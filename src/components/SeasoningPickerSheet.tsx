"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ItemIcon } from "./ItemIcon";

/**
 * Minimal shape we care about for picking. Parent components carry richer
 * types; we accept any superset via the generic Props<T>.
 */
type SeasoningLike = {
  slug: string;
  itemId: string;
  kind: "berry" | "other";
  snackValid: boolean;
  flavours: Record<string, number>;
  dominantFlavour: string | null;
};

type Props<T extends SeasoningLike> = {
  open: boolean;
  onClose: () => void;
  /** Full bait-valid pantry. The sheet filters & groups internally. */
  seasonings: T[];
  /** Slugs already placed in slots, shown with a check mark. */
  occupiedSlugs: string[];
  /** Picked seasoning → parent assigns it to a target slot and closes. */
  onPick: (s: T) => void;
  /** Locale-aware flavour palette (parent owns the constant). */
  flavourColors: Record<string, string>;
  /** Optional title (defaults to "Pick a seasoning"). */
  title?: string;
};

/**
 * Full-screen bottom-sheet picker for snack seasonings on mobile. Same
 * UX language as juice/OwnedBerriesPicker: sticky search + flavour
 * filters, chunky 2-column tap targets, safe-area-aware footer.
 *
 * Picking a seasoning fires onPick and the parent closes the sheet —
 * we don't auto-close in case the parent wants to handle a no-op.
 */
export function SeasoningPickerSheet<T extends SeasoningLike>({
  open,
  onClose,
  seasonings,
  occupiedSlugs,
  onPick,
  flavourColors,
  title,
}: Props<T>) {
  const t = useTranslations("snack");
  const tc = useTranslations("common");
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeFlavours, setActiveFlavours] = useState<Set<string>>(new Set());
  const [kindFilter, setKindFilter] = useState<"all" | "berry" | "other">(
    "all",
  );

  useEffect(() => setMounted(true), []);

  // Reset filters every time the sheet opens to give a clean slate.
  useEffect(() => {
    if (open) {
      setFilter("");
      setActiveFlavours(new Set());
      setKindFilter("all");
    }
  }, [open]);

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

  const filtered = useMemo(() => {
    let list = seasonings.filter((s) => s.snackValid);
    if (kindFilter !== "all") {
      list = list.filter((s) =>
        kindFilter === "berry" ? s.kind === "berry" : s.kind === "other",
      );
    }
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter((s) => s.slug.includes(q));
    }
    if (activeFlavours.size > 0) {
      list = list.filter(
        (s) => s.dominantFlavour && activeFlavours.has(s.dominantFlavour),
      );
    }
    return list;
  }, [seasonings, kindFilter, filter, activeFlavours]);

  const FLAVOURS = ["SWEET", "SPICY", "DRY", "BITTER", "SOUR"];
  const occupiedSet = new Set(occupiedSlugs);

  if (!mounted || !open) return null;

  const toggleFlavour = (f: string) => {
    setActiveFlavours((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Pick a seasoning"}
      className="sm:hidden fixed inset-0 z-[80] flex flex-col bg-background"
    >
      {/* Header (sticky) */}
      <div className="border-b border-border bg-card pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold tracking-tight truncate">
              {title ?? "Pick a seasoning"}
            </h2>
            <p className="text-[11px] text-muted">
              {filtered.length} of {seasonings.filter((s) => s.snackValid).length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-10 -mr-1 flex items-center justify-center rounded-full hover:bg-subtle"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="px-4 pb-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("filterSeasonings")}
            className="w-full rounded-md border border-border bg-subtle px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {/* Kind filter (all / berry / other) */}
        <div className="px-4 pb-1 flex gap-1">
          {(["all", "berry", "other"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              aria-pressed={kindFilter === k}
              className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
                kindFilter === k
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Flavour filter */}
        <div
          className="px-4 pb-3 pt-2 flex flex-wrap gap-1"
          role="group"
          aria-label="Flavour"
        >
          {FLAVOURS.map((f) => {
            const active = activeFlavours.has(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFlavour(f)}
                aria-pressed={active}
                className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors"
                style={
                  active
                    ? {
                        background: `${flavourColors[f]}33`,
                        borderColor: flavourColors[f],
                        color: flavourColors[f],
                      }
                    : undefined
                }
              >
                {f}
              </button>
            );
          })}
          {activeFlavours.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveFlavours(new Set())}
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-border bg-card text-muted hover:text-foreground"
            >
              {tc("clear")}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted py-10">
            {t("noSeasoningMatch")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {filtered.map((s) => {
              const occupied = occupiedSet.has(s.slug);
              const tint = s.dominantFlavour
                ? flavourColors[s.dominantFlavour]
                : null;
              return (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => onPick(s)}
                    className="relative w-full min-h-16 flex items-center gap-3 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:border-accent"
                    style={
                      tint ? { boxShadow: `inset 0 0 0 2px ${tint}22` } : undefined
                    }
                  >
                    <ItemIcon id={s.itemId} size={36} />
                    <span className="text-sm capitalize flex-1 leading-tight break-words">
                      {s.slug.replaceAll("_", " ")}
                    </span>
                    {occupied && (
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
    </div>,
    document.body,
  );
}
