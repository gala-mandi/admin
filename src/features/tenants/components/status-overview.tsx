"use client";

import {
  Ban,
  CircleCheck,
  CircleSlash,
  Hourglass,
  type LucideIcon,
  Store,
} from "lucide-react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type TenantCountKey, useTenantCounts } from "../hooks";
import { shopsListText, tenantStatusText } from "../text";
import type { TenantStatus } from "../types";

const t = shopsListText.overview;

/** Order of the cards: everything first, then the statuses that matter most. */
const cardOrder: readonly TenantCountKey[] = [
  "all",
  "active",
  "trial",
  "suspended",
  "cancelled",
];

const cardStyle: Record<TenantCountKey, { icon: LucideIcon; chip: string }> = {
  all: { icon: Store, chip: "bg-primary text-primary-foreground" },
  active: { icon: CircleCheck, chip: "bg-success/10 text-success" },
  trial: { icon: Hourglass, chip: "bg-secondary text-secondary-foreground" },
  suspended: { icon: Ban, chip: "bg-destructive/10 text-destructive" },
  cancelled: {
    icon: CircleSlash,
    chip: "bg-surface-muted text-muted-foreground",
  },
};

const labelOf = (key: TenantCountKey) =>
  key === "all" ? t.all : tenantStatusText[key];

export interface ShopStatusOverviewProps {
  /** The list's `status` filter; `null` is "All shops". */
  value: TenantStatus | null;
  onChange: (status: TenantStatus | null) => void;
  className?: string;
}

/**
 * One card per status with its platform-wide count. The cards are toggle
 * buttons bound to the list's status filter: pick one to filter, pick it
 * again (or "All shops") to clear.
 */
export function ShopStatusOverview({
  value,
  onChange,
  className,
}: ShopStatusOverviewProps) {
  const counts = useTenantCounts();
  const all = counts.all.total;

  return (
    <div
      role="group"
      aria-label={t.label}
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5",
        className,
      )}
    >
      {cardOrder.map((key) => {
        const count = counts[key];
        const { icon: Icon, chip } = cardStyle[key];
        const selected = key === "all" ? value === null : value === key;
        const hint = count.isError
          ? t.unavailable
          : key === "all"
            ? t.allHint
            : count.total === undefined || all === undefined
              ? null
              : t.share(all > 0 ? Math.round((count.total / all) * 100) : 0);

        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            data-status={key}
            onClick={() =>
              onChange(key === "all" || selected ? null : (key as TenantStatus))
            }
            className={cn(
              "bg-card text-card-foreground rounded-card shadow-panel flex min-w-0 flex-col gap-3 border p-4 text-start transition-[border-color,box-shadow,background-color] outline-none sm:p-5",
              "hover:border-primary/40 focus-visible:ring-ring/50 focus-visible:ring-3",
              selected &&
                "border-primary bg-secondary/50 ring-primary/20 dark:bg-secondary/40 ring-2",
              key === "all" && "col-span-2 lg:col-span-1",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "truncate text-sm font-semibold",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {labelOf(key)}
              </span>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  chip,
                )}
              >
                <Icon aria-hidden className="size-[18px]" />
              </span>
            </span>
            {count.isPending ? (
              <span className="flex h-9 items-center">
                <span className="sr-only">{t.loading}</span>
                <span
                  aria-hidden
                  data-testid="status-count-skeleton"
                  className="bg-muted block h-7 w-14 animate-pulse rounded-md"
                />
              </span>
            ) : (
              <span className="font-heading text-[1.75rem]/9 font-extrabold tracking-tight tabular-nums">
                {count.isError || count.total === undefined
                  ? t.none
                  : formatCount(count.total)}
              </span>
            )}
            <span className="text-muted-foreground min-h-4 truncate text-xs">
              {hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
