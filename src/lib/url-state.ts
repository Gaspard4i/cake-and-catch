"use client";

import { useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filter state encoded directly in the URL via `useSearchParams` and
 * `router.replace`. Every change re-writes `?q=...&type=...` so the
 * browser back-button restores the previous filter set and a copy/
 * paste of the URL reproduces the same view.
 *
 * The shape is open-ended on purpose: the caller hands the schema in
 * via the descriptor object (`scalars` for single strings/numbers,
 * `multi` for repeated string params, `bools` for present-or-absent).
 *
 *   const [state, setState] = useFilterState({
 *     scalars: ["q", "gen", "form", "sort"],
 *     multi: ["type", "label"],
 *     bools: ["shiny"],
 *   });
 *   state.type        // string[]
 *   state.q           // string | null
 *   state.shiny       // boolean
 *   setState({ q: "char", type: ["fire"] }, { resetScroll: false });
 */
export type FilterDescriptor<
  S extends readonly string[] = readonly string[],
  M extends readonly string[] = readonly string[],
  B extends readonly string[] = readonly string[],
> = {
  scalars?: S;
  multi?: M;
  bools?: B;
};

type FilterValue<D extends FilterDescriptor> =
  & { [K in (D["scalars"] extends readonly string[] ? D["scalars"][number] : never)]: string | null }
  & { [K in (D["multi"] extends readonly string[] ? D["multi"][number] : never)]: string[] }
  & { [K in (D["bools"] extends readonly string[] ? D["bools"][number] : never)]: boolean };

type FilterPatch<D extends FilterDescriptor> = Partial<{
  [K in keyof FilterValue<D>]:
    | FilterValue<D>[K]
    | null
    | ((current: FilterValue<D>[K]) => FilterValue<D>[K] | null);
}>;

export interface UseFilterStateOptions {
  /** Pass `false` to keep the page scrolled in place when the URL changes. */
  scroll?: boolean;
}

export function useFilterState<D extends FilterDescriptor>(
  descriptor: D,
): [FilterValue<D>, (patch: FilterPatch<D>, opts?: UseFilterStateOptions) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Stable serialised key — Next 16 sometimes hands a fresh
  // `URLSearchParams` instance back even when the query string did
  // not change. Memoising on `.toString()` keeps the derived state
  // referentially stable so consumer-side `useEffect` deps don't
  // ping-pong forever.
  const qs = searchParams.toString();

  const state = useMemo(() => {
    const sp = new URLSearchParams(qs);
    const out: Record<string, unknown> = {};
    for (const key of descriptor.scalars ?? []) {
      out[key] = sp.get(key);
    }
    for (const key of descriptor.multi ?? []) {
      out[key] = sp.getAll(key);
    }
    for (const key of descriptor.bools ?? []) {
      out[key] = sp.get(key) === "1" || sp.get(key) === "true";
    }
    return out as FilterValue<D>;
  }, [qs, descriptor]);

  // Refs so `setState` doesn't have to re-build when state changes —
  // it always reads the latest value at call time. The callback
  // identity stays stable across renders unless `pathname`/`router`
  // change.
  const stateRef = useRef(state);
  stateRef.current = state;
  const qsRef = useRef(qs);
  qsRef.current = qs;

  const setState = useCallback(
    (patch: FilterPatch<D>, opts: UseFilterStateOptions = {}) => {
      const next = new URLSearchParams(qsRef.current);
      for (const [rawKey, rawValue] of Object.entries(patch)) {
        const key = rawKey;
        const value =
          typeof rawValue === "function"
            ? (rawValue as (c: unknown) => unknown)(
                (stateRef.current as unknown as Record<string, unknown>)[key],
              )
            : rawValue;

        next.delete(key);
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value as string[]) {
            if (v != null && v !== "") next.append(key, v);
          }
        } else if (typeof value === "boolean") {
          if (value) next.set(key, "1");
        } else if (typeof value === "string") {
          if (value !== "") next.set(key, value);
        } else if (typeof value === "number") {
          next.set(key, String(value));
        }
      }
      const nextQs = next.toString();
      // Don't push a duplicate URL — `router.replace` to the exact
      // same href still emits a new history entry that some
      // consumers re-render on, which is the original feedback loop.
      if (nextQs === qsRef.current) return;
      const url = nextQs ? `${pathname}?${nextQs}` : pathname;
      router.replace(url, { scroll: opts.scroll ?? false });
    },
    [router, pathname],
  );

  return [state, setState];
}

/** Plain helper for non-React callers (server components, tests). */
export function readFilters<D extends FilterDescriptor>(
  descriptor: D,
  search: URLSearchParams,
): FilterValue<D> {
  const out: Record<string, unknown> = {};
  for (const key of descriptor.scalars ?? []) out[key] = search.get(key);
  for (const key of descriptor.multi ?? []) out[key] = search.getAll(key);
  for (const key of descriptor.bools ?? [])
    out[key] = search.get(key) === "1" || search.get(key) === "true";
  return out as FilterValue<D>;
}
