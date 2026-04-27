"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Controlled open state. */
  open: boolean;
  /** Title shown at the top. e.g. "Name this snack". */
  title: string;
  /** Pre-fill suggestion. */
  defaultValue?: string;
  /** Optional secondary line under the title. */
  hint?: string;
  /** Confirm label. Defaults to "Save". */
  confirmLabel?: string;
  /** Cancel label. Defaults to "Cancel". */
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

/**
 * Modal-style name input for saving snacks / aprijuices. Replaces
 * window.prompt — keeps the user inside the app, supports keyboard
 * (Enter to confirm, Esc to cancel), and matches the rest of the UI.
 *
 * Rendered in a portal on document.body so the backdrop covers the full
 * viewport even if the trigger sits inside a clipped container.
 */
export function NameRecipeModal({
  open,
  title,
  defaultValue = "",
  hint,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset the field whenever the modal opens with a new default.
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  // Focus the input + select-all on open. Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  const submit = () => {
    const trimmed = value.trim().slice(0, 80);
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div className="relative w-[min(92vw,420px)] rounded-xl border border-border bg-card p-5 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="mt-3 w-full rounded-md border border-border bg-subtle px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="e.g. shiny lure setup"
        />
        <div className="mt-1 text-[10px] text-muted text-right tabular-nums">
          {value.length}/80
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs uppercase tracking-wide px-3 py-1.5 rounded border border-border hover:bg-subtle"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={value.trim().length === 0}
            className="text-xs uppercase tracking-wide px-3 py-1.5 rounded bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-30"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
