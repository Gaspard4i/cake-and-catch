"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  apricorn: string;
  berrySlugs: string[];
};

/**
 * Save the current /juice/recipe composition (apricorn + berries) into
 * localStorage so the user can recall it later from /saved.
 */
export function SaveJuiceButton({ apricorn, berrySlugs }: Props) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const disabled = berrySlugs.length === 0;
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          const defaultName = `${apricorn.toLowerCase()} · ${berrySlugs
            .map((s) => s.replace(/_berry$/, ""))
            .join(", ")}`;
          const name = window.prompt("Name this aprijuice:", defaultName);
          if (!name) return;
          const { saveJuice } = await import("@/lib/saved-recipes");
          saveJuice({
            name: name.trim().slice(0, 80),
            apricorn,
            seasoningSlugs: berrySlugs,
          });
          setSavedAt(Date.now());
        }}
        className="text-[10px] uppercase tracking-wide px-2 py-1 rounded border border-border hover:bg-subtle disabled:opacity-30"
      >
        Save aprijuice
      </button>
      <Link
        href="/saved"
        className="text-[10px] uppercase tracking-wide text-muted hover:text-foreground"
      >
        My recipes
      </Link>
      {savedAt && <span className="text-[10px] text-green-600">saved</span>}
    </div>
  );
}
