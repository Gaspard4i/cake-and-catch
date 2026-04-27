"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  /** Fallback href when there's no usable history (deep link, fresh tab). */
  fallback: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Back button that prefers the browser's previous entry (so the user
 * lands back on the listing they came from — pokedex grid scrolled to
 * row N, search results, biome page…) and falls back to a known route
 * when there isn't one (direct deep-link, new tab).
 *
 * Detects "no usable history" with `window.history.length <= 1`. We
 * also fall back when the previous entry is from a different origin —
 * detected best-effort via `document.referrer`.
 */
export function BackLink({ fallback, children, className }: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // history.length is 1 when the page was opened via direct URL or
    // new tab. Same-origin referrer is a stronger signal that going
    // back will land somewhere inside the app.
    const sameOriginReferrer =
      document.referrer && new URL(document.referrer).origin === window.location.origin;
    setCanGoBack(window.history.length > 1 && Boolean(sameOriginReferrer));
  }, []);

  if (!canGoBack) {
    return (
      <Link href={fallback} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={className}
    >
      {children}
    </button>
  );
}
