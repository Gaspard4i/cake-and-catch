"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteJuice,
  deleteSnack,
  listSavedJuices,
  listSavedSnacks,
  renameJuice,
  renameSnack,
  type SavedJuice,
  type SavedSnack,
} from "@/lib/saved-recipes";
import { Skeleton } from "@/components/Loader";

export function SavedRecipesClient() {
  const [snacks, setSnacks] = useState<SavedSnack[]>([]);
  const [juices, setJuices] = useState<SavedJuice[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSnacks(listSavedSnacks());
    setJuices(listSavedJuices());
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (snacks.length === 0 && juices.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        No saved recipe yet. Cook a snack on{" "}
        <Link href="/snack" className="text-foreground hover:underline">
          Snack maker
        </Link>{" "}
        or pick a juice on{" "}
        <Link href="/juice" className="text-foreground hover:underline">
          Aprijuice maker
        </Link>{" "}
        and hit the Save button.
      </div>
    );
  }

  const refreshSnacks = () => setSnacks(listSavedSnacks());
  const refreshJuices = () => setJuices(listSavedJuices());

  return (
    <div className="grid gap-8">
      {snacks.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted mb-2">
            Snacks ({snacks.length})
          </h2>
          <ul className="grid gap-2">
            {snacks.map((s) => (
              <li
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 sm:flex-1">
                  <div className="font-medium truncate text-sm">{s.name}</div>
                  <div className="text-[11px] text-muted truncate">
                    {s.seasoningSlugs.join(" · ").replace(/_/g, " ")}
                  </div>
                  <div className="text-[10px] text-muted">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    href={`/snack?load=${encodeURIComponent(s.id)}`}
                    className="text-[11px] uppercase px-2 py-1 rounded border border-border hover:bg-subtle"
                  >
                    Load
                  </Link>
                  <button
                    onClick={() => {
                      const next = window.prompt("Rename:", s.name);
                      if (next && next.trim()) {
                        renameSnack(s.id, next.trim().slice(0, 80));
                        refreshSnacks();
                      }
                    }}
                    className="text-[11px] uppercase text-muted hover:text-foreground px-1"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${s.name}"?`)) {
                        deleteSnack(s.id);
                        refreshSnacks();
                      }
                    }}
                    className="text-[11px] uppercase text-muted hover:text-red-500 px-1"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {juices.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted mb-2">
            Aprijuices ({juices.length})
          </h2>
          <ul className="grid gap-2">
            {juices.map((j) => (
              <li
                key={j.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 sm:flex-1">
                  <div className="font-medium truncate text-sm">{j.name}</div>
                  <div className="text-[11px] text-muted truncate">
                    {j.apricorn.toLowerCase()} ·{" "}
                    {j.seasoningSlugs.join(", ").replace(/_/g, " ") ||
                      "no berry"}
                  </div>
                  <div className="text-[10px] text-muted">
                    {new Date(j.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    href={`/juice/recipe?apricorn=${encodeURIComponent(
                      j.apricorn,
                    )}&berries=${encodeURIComponent(j.seasoningSlugs.join(","))}`}
                    className="text-[11px] uppercase px-2 py-1 rounded border border-border hover:bg-subtle"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => {
                      const next = window.prompt("Rename:", j.name);
                      if (next && next.trim()) {
                        renameJuice(j.id, next.trim().slice(0, 80));
                        refreshJuices();
                      }
                    }}
                    className="text-[11px] uppercase text-muted hover:text-foreground px-1"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${j.name}"?`)) {
                        deleteJuice(j.id);
                        refreshJuices();
                      }
                    }}
                    className="text-[11px] uppercase text-muted hover:text-red-500 px-1"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
