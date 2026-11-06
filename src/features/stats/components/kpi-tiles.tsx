"use client";

import {
  Ban,
  CircleCheck,
  Hourglass,
  type LucideIcon,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlatformStats } from "../hooks";
import { statsText } from "../text";
import type { PlatformStats } from "../types";

const t = statsText.tiles;

type TileKey = "totalShops" | "active" | "trial" | "suspended" | "totalUsers";

interface Tile {
  key: TileKey;
  icon: LucideIcon;
  chip: string;
  value: (s: PlatformStats) => number;
  hint: (s: PlatformStats) => string;
}

const share = (part: number, s: PlatformStats) =>
  t.shareHint(part, s.shops.total);

const tiles: readonly Tile[] = [
  {
    key: "totalShops",
    icon: Store,
    chip: "bg-primary text-primary-foreground",
    value: (s) => s.shops.total,
    hint: (s) => t.cancelledHint(formatCount(s.shops.cancelled)),
  },
  {
    key: "active",
    icon: CircleCheck,
    chip: "bg-success/10 text-success",
    value: (s) => s.shops.active,
    hint: (s) => share(s.shops.active, s),
  },
  {
    key: "trial",
    icon: Hourglass,
    chip: "bg-secondary text-secondary-foreground",
    value: (s) => s.shops.trial,
    hint: (s) => share(s.shops.trial, s),
  },
  {
    key: "suspended",
    icon: Ban,
    chip: "bg-destructive/10 text-destructive",
    value: (s) => s.shops.suspended,
    hint: (s) => share(s.shops.suspended, s),
  },
  {
    key: "totalUsers",
    icon: Users,
    chip: "bg-secondary text-secondary-foreground",
    value: (s) => s.users.total,
    hint: (s) => t.activeUsersHint(formatCount(s.users.active)),
  },
];

/** KPI tiles: total shops, active, trial, suspended and total users. */
export function KpiTiles({ className }: { className?: string }) {
  const stats = usePlatformStats();

  if (stats.isError) {
    return (
      <section
        role="alert"
        aria-label={t.label}
        className={cn(
          "bg-card text-card-foreground rounded-card shadow-panel flex flex-col items-start gap-3 border p-5",
          className,
        )}
      >
        <p className="text-destructive text-sm">{t.error}</p>
        <Button variant="outline" onClick={() => stats.refetch()}>
          {statsText.retry}
        </Button>
      </section>
    );
  }

  return (
    <section aria-label={t.label} className={className}>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {tiles.map(({ key, icon: Icon, chip, value, hint }) => (
          <div
            key={key}
            data-tile={key}
            className={cn(
              "bg-card text-card-foreground rounded-card shadow-panel flex min-w-0 flex-col gap-3 border p-4 sm:p-5",
              key === "totalShops" && "col-span-2 lg:col-span-1",
            )}
          >
            <dt className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground truncate text-sm font-semibold">
                {t[key]}
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  chip,
                )}
              >
                <Icon className="size-[18px]" />
              </span>
            </dt>
            <dd className="flex flex-col gap-1">
              {stats.isPending ? (
                <span className="flex h-9 items-center">
                  <span className="sr-only">{statsText.loading}</span>
                  <span
                    aria-hidden
                    data-testid="kpi-skeleton"
                    className="bg-muted block h-7 w-14 animate-pulse rounded-md"
                  />
                </span>
              ) : (
                <span className="font-heading text-[1.75rem]/9 font-extrabold tracking-tight tabular-nums">
                  {formatCount(value(stats.data))}
                </span>
              )}
              <span className="text-muted-foreground min-h-4 truncate text-xs">
                {stats.data ? hint(stats.data) : null}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
