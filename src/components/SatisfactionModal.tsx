"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircleHeart, Star, X } from "lucide-react";
import {
  DISCORD_HANDLE,
  DiscordIcon,
  GITHUB_ISSUES_URL,
  GithubIcon,
} from "./Feedback";

const STORAGE_KEY = "satisfaction-dismissed";
/** Time in milliseconds spent on the site before the modal auto-opens. */
const APPEAR_DELAY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Appears once per visitor after 10 minutes of cumulative app usage
 * (resets if the tab stays background, tracked via visibilitychange).
 * User can dismiss forever with a "don't show again" button, submit a
 * rating (1-5 stars + optional comment) or jump straight to the
 * dedicated feedback channels.
 *
 * Storage: localStorage `satisfaction-dismissed` holds one of:
 *   - missing → not shown yet
 *   - "dismissed" → user closed without rating, don't bother them again
 *   - "rated" → they rated, don't show again
 */
export function SatisfactionModal() {
  const t = useTranslations("satisfaction");
  const tFeedback = useTranslations("feedback");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Defer the timer until the user has accumulated APPEAR_DELAY_MS of
  // ACTIVE time (page visible). Skip entirely if already dismissed/rated.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    let remaining = APPEAR_DELAY_MS;
    let lastTick = Date.now();
    let timer: number | undefined;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      remaining -= now - lastTick;
      lastTick = now;
      if (remaining <= 0) {
        setOpen(true);
        stop();
      }
    };

    const start = () => {
      lastTick = Date.now();
      timer = window.setInterval(tick, 10_000);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    };

    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Lock body scroll while open.
  useLayoutEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dismiss = (reason: "dismissed" | "rated") => {
    try {
      localStorage.setItem(STORAGE_KEY, reason);
    } catch {
      // ignore (private mode)
    }
    setOpen(false);
  };

  const submit = async () => {
    if (stars < 1 || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/site/rate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || null, locale }),
      });
      setSubmitted(true);
      // Give the user a moment to read the thank-you before closing.
      setTimeout(() => dismiss("rated"), 1500);
    } catch {
      // Let them retry on failure — don't dismiss.
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="satisfaction-title"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={() => dismiss("dismissed")}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircleHeart className="h-5 w-5 text-accent" aria-hidden />
              <h2 id="satisfaction-title" className="text-lg font-semibold">
                {t("title")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss("dismissed")}
            aria-label={t("close")}
            className="size-8 rounded-md hover:bg-subtle flex items-center justify-center"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {submitted ? (
          <p className="py-6 text-center text-sm">{t("thanks")}</p>
        ) : (
          <>
            {/* Star picker */}
            <div
              className="flex items-center justify-center gap-1"
              role="radiogroup"
              aria-label={t("rateLabel")}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || stars) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={stars === n}
                    aria-label={`${n} / 5`}
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="size-10 flex items-center justify-center transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        active
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-border bg-subtle px-3 py-2 text-sm outline-none focus:border-accent resize-none"
            />

            <div className="rounded-lg border border-border bg-subtle p-3 text-xs space-y-2">
              <p className="text-muted">{t("feedbackIntro")}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 hover:bg-card/80 transition-colors"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  {tFeedback("ctaGithub")}
                </a>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5">
                  <DiscordIcon className="h-3.5 w-3.5 text-[#5865F2]" />
                  <span className="text-muted">Discord:</span>
                  <code className="font-mono">{DISCORD_HANDLE}</code>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => dismiss("dismissed")}
                className="text-xs text-muted hover:text-foreground underline underline-offset-2"
              >
                {t("dontShowAgain")}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={stars < 1 || submitting}
                className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {submitting ? t("submitting") : t("submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
