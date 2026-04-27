import { useTranslations } from "next-intl";
import { MessageCircleHeart } from "lucide-react";
import { RatingForm } from "./RatingForm";
import { ShareButton } from "./ShareButton";

export const DISCORD_HANDLE = "Gaz4i";
export const GITHUB_ISSUES_URL =
  "https://github.com/Gaspard4i/snack-and-catch/issues/new";
export const GITHUB_PROFILE_URL = "https://github.com/Gaspard4i";

/**
 * Static feedback card. Server-component safe (no client hooks) — mounts
 * on /about and any other long-form page. The always-on floating button
 * lives in FloatingFeedback.tsx (client).
 */
export function FeedbackCard({ className = "" }: { className?: string }) {
  const t = useTranslations("feedback");
  return (
    <section
      className={`rounded-xl border border-accent/40 bg-accent/5 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <MessageCircleHeart
          className="h-5 w-5 text-accent shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {t("body")}
          </p>

          {/* Inline rating form: lets visitors rate the site right here
              without waiting for the 10-min modal to pop up. */}
          <div className="mt-4 rounded-lg border border-border bg-card p-3">
            <RatingForm showComment />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ShareButton />
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-subtle transition-colors"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              {t("ctaGithub")}
            </a>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
              <DiscordIcon className="h-3.5 w-3.5 text-[#5865F2]" />
              <span className="text-muted">Discord:</span>
              <code className="font-mono">{DISCORD_HANDLE}</code>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Simple GitHub mark — inline SVG (lucide-react in this version has
 *  no `Github` export). Colour via currentColor. */
export function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.25 9.27 7.76 10.77.57.11.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.16.69-3.83-1.35-3.83-1.35-.52-1.32-1.26-1.67-1.26-1.67-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.52-.29-5.18-1.26-5.18-5.62 0-1.24.44-2.25 1.17-3.05-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.14 1.16.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.47 3.14-1.16 3.14-1.16.62 1.58.23 2.75.11 3.04.73.8 1.17 1.81 1.17 3.05 0 4.37-2.66 5.33-5.19 5.61.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.2.66.79.55 4.5-1.51 7.75-5.76 7.75-10.77C23.33 5.56 18.27.5 12 .5Z" />
    </svg>
  );
}

/** Official Discord "Clyde" mark — inline SVG. */
export function DiscordIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 127.14 96.36"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
    </svg>
  );
}
