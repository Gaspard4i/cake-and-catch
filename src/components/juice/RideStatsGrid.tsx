"use client";

import {
  ArrowUp,
  Shield,
  Target,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { RidingStat } from "@/lib/recommend/aprijuice";

const STAT_ICON: Record<RidingStat, LucideIcon> = {
  ACCELERATION: Zap,
  SKILL: Target,
  SPEED: Wind,
  STAMINA: Shield,
  JUMP: ArrowUp,
};

const STAT_TONE: Record<RidingStat, string> = {
  ACCELERATION: "text-red-600 dark:text-red-400",
  SKILL: "text-cyan-600 dark:text-cyan-400",
  SPEED: "text-pink-600 dark:text-pink-400",
  STAMINA: "text-amber-600 dark:text-amber-400",
  JUMP: "text-purple-600 dark:text-purple-400",
};

const ORDER: RidingStat[] = [
  "ACCELERATION",
  "SKILL",
  "SPEED",
  "STAMINA",
  "JUMP",
];

export function RideStatsGrid({
  stats,
}: {
  stats: Partial<Record<RidingStat, number>>;
}) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {ORDER.map((stat) => {
        const delta = stats[stat] ?? 0;
        const Icon = STAT_ICON[stat];
        return (
          <li
            key={stat}
            className={`rounded-lg border p-2 flex flex-col items-center gap-1 ${
              delta > 0
                ? "border-emerald-500/40 bg-emerald-500/5"
                : delta < 0
                  ? "border-red-500/40 bg-red-500/5"
                  : "border-border"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${STAT_TONE[stat]}`}
              aria-hidden
              strokeWidth={2.25}
            />
            <span className="text-[10px] uppercase font-medium tracking-wide">
              {stat.toLowerCase()}
            </span>
            <span
              className={`font-mono text-base tabular-nums ${
                delta > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : delta < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
