"use client";

import { Loader2 } from "lucide-react";

/**
 * Inline spinner for in-flight requests. Keep small; caller controls
 * placement (usually next to a section heading or inside a toolbar).
 */
export function Spinner({
  size = 14,
  className = "",
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-muted ${className}`}
    >
      <Loader2
        className="animate-spin text-accent"
        style={{ width: size, height: size }}
        aria-hidden
      />
      {label && <span className="text-[10px] uppercase tracking-wide">{label}</span>}
    </span>
  );
}

/**
 * Gray shimmer block used as placeholder for cards/sprites/text lines while
 * data is loading. Respects prefers-reduced-motion via Tailwind defaults.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-subtle ${className}`}
      style={style}
    />
  );
}

/** A rough pokédex-card skeleton used while the first page loads. */
export function PokedexCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="size-[120px] rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mx-auto" />
      <Skeleton className="h-3 w-16 mx-auto" />
      <div className="space-y-1 pt-2">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-full" />
      </div>
    </div>
  );
}

/** Compact card skeleton used for the Attracted grid. */
export function AttractedCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-2 flex items-center gap-2">
      <Skeleton className="size-11 rounded-md" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/**
 * Generic full-page skeleton: hero block + a couple of content rows.
 * Used as the Suspense fallback while a page boundary streams its data,
 * so the user sees structured shimmer instead of a textual "..." stub.
 */
export function PageSkeleton({
  variant = "generic",
}: {
  variant?: "generic" | "snack" | "juice" | "pokedex";
}) {
  if (variant === "snack") {
    return (
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-8">
          <div className="max-w-2xl space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4 max-w-sm" />
          </div>
          <Skeleton className="size-10 shrink-0" />
        </header>
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <Skeleton className="aspect-square w-full max-w-[220px] rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="size-16 rounded-lg" />
              <Skeleton className="size-16 rounded-lg" />
              <Skeleton className="size-16 rounded-lg" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (variant === "juice") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (variant === "pokedex") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <PokedexCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-4 w-5/6 max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Top-of-page thin progress bar, sticky under the navbar. Use when a
 *  fetch is in flight but the existing content is still visible. */
export function TopProgress({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden pointer-events-none"
    >
      <div className="h-full w-1/3 bg-accent animate-[progress_1.2s_ease-in-out_infinite]" />
      <style>{`@keyframes progress{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}
