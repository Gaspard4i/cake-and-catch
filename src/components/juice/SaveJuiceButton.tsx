"use client";

import Link from "next/link";
import { useState } from "react";
import { NameRecipeModal } from "../NameRecipeModal";

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
  const [modalOpen, setModalOpen] = useState(false);
  const disabled = berrySlugs.length === 0;
  const defaultName = `${apricorn.toLowerCase()} · ${berrySlugs
    .map((s) => s.replace(/_berry$/, ""))
    .join(", ")}`;

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setModalOpen(true)}
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

      <NameRecipeModal
        open={modalOpen}
        title="Name this aprijuice"
        hint="Saved locally in your browser."
        defaultValue={defaultName}
        onCancel={() => setModalOpen(false)}
        onConfirm={async (name) => {
          const { saveJuice } = await import("@/lib/saved-recipes");
          saveJuice({ name, apricorn, seasoningSlugs: berrySlugs });
          setSavedAt(Date.now());
          setModalOpen(false);
        }}
      />
    </div>
  );
}
