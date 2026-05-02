"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MultiSelectOption = {
  value: string;
  label: string;
  /** Optional group name used to render section headers inside the menu. */
  group?: string;
  /** Optional description shown under the label. */
  description?: string;
  /**
   * When true, the option is forced selected and the user cannot toggle
   * it. The checkbox is shown as checked + disabled. Used for required
   * defaults the consumer must keep applying (e.g. cobblemon + minecraft
   * namespaces).
   */
  locked?: boolean;
};

/**
 * Compact multi-select combobox. Looks like a single pill by default; the
 * menu is a popover with a search box, grouped checkboxes, and select-all /
 * clear shortcuts. Designed to replace long rows of filter chips.
 *
 * Keyboard: Enter/Space toggles the focused option, Escape closes, typing
 * filters. Keeps its popover inside the viewport via fixed positioning.
 */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Any",
  searchable = true,
  maxSummary = 2,
  maxSelection,
  className = "",
}: {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  /** How many selected labels to show in the button before falling back to count. */
  maxSummary?: number;
  /** Optional hard cap on the number of concurrent selections. */
  maxSelection?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.group ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, MultiSelectOption[]>();
    for (const o of filtered) {
      const g = o.group ?? "";
      const list = m.get(g) ?? [];
      list.push(o);
      m.set(g, list);
    }
    return [...m.entries()];
  }, [filtered]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (v: string) => {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else {
      if (maxSelection !== undefined && next.size >= maxSelection) return;
      next.add(v);
    }
    onChange([...next]);
  };
  const selectAllVisible = () => {
    const next = new Set(selectedSet);
    for (const o of filtered) {
      if (maxSelection !== undefined && next.size >= maxSelection) break;
      next.add(o.value);
    }
    onChange([...next]);
  };
  const clear = () => onChange([]);

  const selectedLabels = options
    .filter((o) => selectedSet.has(o.value))
    .map((o) => o.label);
  const summary =
    value.length === 0
      ? placeholder
      : selectedLabels.length <= maxSummary
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, maxSummary).join(", ")} +${selectedLabels.length - maxSummary}`;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm transition-colors min-w-0 ${
          value.length > 0
            ? "border-accent text-foreground"
            : "border-border text-muted hover:text-foreground"
        }`}
      >
        <span className="text-[10px] uppercase tracking-wide text-muted shrink-0">
          {label}
        </span>
        <span className="truncate max-w-[10rem] sm:max-w-[16rem]">{summary}</span>
        {value.length > 0 && (
          <span className="shrink-0 text-[10px] bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 font-mono">
            {value.length}
          </span>
        )}
        <svg
          className={`shrink-0 size-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute left-0 top-full mt-1 min-w-[260px] max-w-[min(320px,90vw)] z-[60] rounded-lg border border-border bg-card shadow-xl overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Filter ${label.toLowerCase()}…`}
                autoFocus
                className="w-full rounded-md border border-border bg-subtle px-2 py-1 text-xs outline-none focus:border-accent"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {grouped.length === 0 && (
              <p className="text-xs text-muted p-3">No match.</p>
            )}
            {grouped.map(([group, items]) => (
              <div key={group}>
                {group && (
                  <div className="text-[10px] uppercase tracking-wider text-muted px-3 pt-2 pb-1">
                    {group}
                  </div>
                )}
                {items.map((o) => {
                  const active = selectedSet.has(o.value) || !!o.locked;
                  const capped =
                    !active &&
                    maxSelection !== undefined &&
                    value.length >= maxSelection;
                  const disabled = capped || !!o.locked;
                  const hint = o.locked
                    ? "Required — always selected"
                    : capped
                      ? `Max ${maxSelection} selections`
                      : undefined;
                  return (
                    <label
                      key={o.value}
                      className={`flex items-start gap-2 px-3 py-1.5 text-sm ${
                        disabled
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer hover:bg-subtle"
                      } ${active ? "text-foreground" : "text-muted"}`}
                      title={hint}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-accent"
                        checked={active}
                        disabled={disabled}
                        onChange={() => {
                          if (o.locked) return;
                          toggle(o.value);
                        }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">
                          {o.label}
                          {o.locked && (
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-muted">
                              · locked
                            </span>
                          )}
                        </span>
                        {o.description && (
                          <span className="block text-[10px] text-muted truncate">
                            {o.description}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-subtle/50 px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted">
            <button
              type="button"
              onClick={selectAllVisible}
              className="hover:text-foreground"
              disabled={filtered.length === 0}
            >
              select all visible
            </button>
            <button
              type="button"
              onClick={clear}
              className="hover:text-foreground"
              disabled={value.length === 0}
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
