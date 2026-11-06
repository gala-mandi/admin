"use client";

import { CalendarClock, CreditCard, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDay, formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { subscriptionText as t } from "../text";
import type { TenantDetail } from "../types";
import { AccessStateBadge } from "./access-state-badge";
import { DetailCard, DetailItem } from "./detail-card";
import { SubscriptionDialog } from "./subscription-dialog";

const isFree = (price: string) => !/[1-9]/.test(price);

/** Share of the plan's period used, for the progress bar (0–100). */
function periodUsed(startsOn: string, endsOn: string, daysLeft: number) {
  const [a, b] = [startsOn, endsOn].map((d) => Date.parse(`${d}T00:00:00Z`));
  const total = Math.max(1, Math.round((b - a) / 86_400_000));
  return Math.min(100, Math.max(0, ((total - daysLeft) / total) * 100));
}

/** The shop's plan, dates, days left, users and state, with Assign / extend. */
export function SubscriptionCard({ tenant }: { tenant: TenantDetail }) {
  const [open, setOpen] = useState(false);
  const sub = tenant.subscription ?? null;

  return (
    <DetailCard title={t.section}>
      {sub ? (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <CreditCard aria-hidden className="size-[18px]" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span
                    data-testid="subscription-plan"
                    className="font-heading truncate text-lg font-bold"
                  >
                    {sub.plan.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {isFree(sub.plan.priceMonthly)
                      ? t.free
                      : `${formatRs(sub.plan.priceMonthly)} ${t.perMonth}`}
                  </span>
                </div>
              </div>
              <AccessStateBadge
                state={sub.state}
                className="h-6 px-2.5 text-xs"
              />
            </div>
            {sub.state === "active" ? (
              <div className="flex flex-col gap-1.5">
                <div
                  aria-hidden
                  className="bg-surface-muted h-1.5 overflow-hidden rounded-full"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      sub.daysLeft <= 7 ? "bg-notice" : "bg-primary",
                    )}
                    style={{
                      inlineSize: `${periodUsed(sub.startsOn, sub.endsOn, sub.daysLeft)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            <p
              data-testid="subscription-hint"
              className={cn(
                "text-sm/relaxed",
                sub.state === "read_only"
                  ? "text-destructive font-medium"
                  : sub.state === "grace"
                    ? "text-notice font-medium"
                    : "text-muted-foreground",
              )}
            >
              {sub.state === "active"
                ? t.stateHint.active(sub.daysLeft)
                : sub.state === "grace"
                  ? t.stateHint.grace(sub.graceDaysLeft)
                  : t.stateHint.read_only}
            </p>
          </div>
          <dl className="flex flex-col gap-3">
            <DetailItem label={t.started}>{formatDay(sub.startsOn)}</DetailItem>
            <DetailItem label={t.ends}>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock
                  aria-hidden
                  className="text-muted-foreground size-3.5"
                />
                {formatDay(sub.endsOn)}
              </span>
            </DetailItem>
            <DetailItem label={t.graceEnds}>
              {formatDay(sub.graceEndsOn)}
            </DetailItem>
            <DetailItem label={t.users}>
              <span
                className="inline-flex items-center gap-1.5 tabular-nums"
                title={t.usersHint}
              >
                <Users aria-hidden className="text-muted-foreground size-3.5" />
                {t.usersOf(sub.usersUsed, sub.plan.maxUsers)}
              </span>
            </DetailItem>
          </dl>
          <p className="text-muted-foreground text-xs">
            {t.branches(sub.plan.maxBranches)}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{t.none}</p>
      )}
      <Button
        variant={sub?.state === "active" ? "outline" : "default"}
        className="w-full gap-2"
        onClick={() => setOpen(true)}
      >
        <CalendarClock aria-hidden />
        {sub ? t.manage : t.noneAction}
      </Button>
      {open ? (
        <SubscriptionDialog tenant={tenant} onClose={() => setOpen(false)} />
      ) : null}
    </DetailCard>
  );
}
