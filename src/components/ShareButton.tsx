"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

const SHARE_TITLE = "Snack & Catch";
const SHARE_TEXT =
  "For every Cobblemon: which Poké Snack to cook to attract it, where it spawns, under what conditions.";

function shareUrl(): string {
  // Prefer the configured public site URL (so clipboard fallbacks land
  // on prod even when the user is on a preview domain), otherwise the
  // current origin so dev / preview still produces a working link.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "") + "/";
  if (typeof window !== "undefined") return window.location.origin + "/";
  return "/";
}

/**
 * Share the app. Uses the Web Share API on platforms that have it
 * (mobile, recent desktop browsers) so the user gets the native share
 * sheet. Falls back to a clipboard copy with a "Copied" confirmation,
 * and surfaces a plain link otherwise so the user can long-press on
 * older browsers.
 *
 * The pre-baked message (SHARE_TITLE + SHARE_TEXT + URL) is the same
 * across all paths so analytics can correlate them later if needed.
 */
export function ShareButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = shareUrl();
    const data: ShareData = {
      title: SHARE_TITLE,
      text: SHARE_TEXT,
      url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        // User aborted the share sheet — don't show "copied", don't fall
        // through to the clipboard. Anything else falls through.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Clipboard fallback.
    const fallback = `${SHARE_TITLE}. ${SHARE_TEXT}\n${url}`;
    try {
      await navigator.clipboard.writeText(fallback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: do nothing. The link is right there in the UI
      // below for the user to copy by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-subtle transition-colors ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
          <span className="flex-1 text-left">Link copied</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Share Snack &amp; Catch</span>
          <Copy className="h-3 w-3 text-muted shrink-0" aria-hidden />
        </>
      )}
    </button>
  );
}
