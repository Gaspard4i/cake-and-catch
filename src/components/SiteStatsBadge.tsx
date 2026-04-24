"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Star } from "lucide-react";

type Stats = {
  visits: number;
  ratingCount: number;
  ratingAverage: number;
};

/**
 * Compact badge under the home intro: cumulative visits + average
 * satisfaction rating. Bumps the visit counter once per browser session
 * via sessionStorage so it doesn't over-count reloads.
 */
export function SiteStatsBadge() {
  const t = useTranslations("siteStats");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Count this visit once per tab session, then fetch the aggregates.
    const KEY = "visit-counted";
    const run = async () => {
      try {
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, "1");
          await fetch("/api/site/visit", { method: "POST" });
        }
      } catch {
        // Ignore — counter is best-effort.
      }
      try {
        const res = await fetch("/api/site/stats");
        const data = (await res.json()) as Stats;
        setStats(data);
      } catch {
        /* ignore */
      }
    };
    run();
  }, []);

  if (!stats) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        <span className="tabular-nums">
          {stats.visits.toLocaleString()}
        </span>
        <span>{t("visits", { count: stats.visits })}</span>
      </span>
      {stats.ratingCount > 0 && (
        <span
          className="inline-flex items-center gap-1.5"
          title={t("ratingTitle", {
            count: stats.ratingCount,
            avg: stats.ratingAverage,
          })}
        >
          <Star
            className="h-3.5 w-3.5 text-amber-500 fill-amber-500"
            aria-hidden
          />
          <span className="tabular-nums font-medium text-foreground">
            {stats.ratingAverage.toFixed(1)}
          </span>
          <span className="text-muted">/ 5</span>
          <span className="text-muted">
            · {t("ratingVotes", { count: stats.ratingCount })}
          </span>
        </span>
      )}
    </div>
  );
}
