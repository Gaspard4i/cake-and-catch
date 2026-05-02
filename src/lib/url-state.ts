"use client";

import { useCallback, useMemo } from "react";
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

  const state = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const key of descriptor.scalars ?? []) {
      out[key] = searchParams.get(key);
    }
    for (const key of descriptor.multi ?? []) {
      out[key] = searchParams.getAll(key);
    }
    for (const key of descriptor.bools ?? []) {
      out[key] = searchParams.get(key) === "1" || searchParams.get(key) === "true";
    }
    return out as FilterValue<D>;
  }, [searchParams, descriptor]);

  const setState = useCallback(
    (patch: FilterPatch<D>, opts: UseFilterStateOptions = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [rawKey, rawValue] of Object.entries(patch)) {
        const key = rawKey;
        const value =
          typeof rawValue === "function"
            ? (rawValue as (c: unknown) => unknown)(
                (state as unknown as Record<string, unknown>)[key],
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
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: opts.scroll ?? false });
    },
    [router, pathname, searchParams, state],
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
