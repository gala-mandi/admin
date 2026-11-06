"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { panelText } from "@/features/panel/text";
import { formatDateTime, formatRelative } from "@/lib/format";
import { shopRoutes } from "@/lib/routes";
import { ACTIVITY_LIMIT, useActivity } from "../hooks";
import { actionLabel, entityLabel, statsText } from "../text";
import type { ActivityItem } from "../types";

const t = statsText.activity;

function Row({ item }: { item: ActivityItem }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className="bg-secondary text-secondary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
      >
        <Activity className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        <p className="break-words">
          <span className="font-semibold">{item.user?.name ?? t.system}</span>
          {item.user ? (
            <span className="text-muted-foreground">
              {" "}
              ({panelText.roles[item.user.role]})
            </span>
          ) : null}{" "}
          {actionLabel(item.action)} {entityLabel(item.entity)}
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          {item.tenant ? (
            <Link
              href={shopRoutes.detail(item.tenant.id)}
              className="text-link focus-visible:ring-ring/50 rounded-sm font-medium outline-none hover:underline focus-visible:ring-3"
            >
              {item.tenant.name}
            </Link>
          ) : (
            <span>{t.platform}</span>
          )}
          <span aria-hidden>·</span>
          <time
            dateTime={item.createdAt}
            title={formatDateTime(item.createdAt)}
          >
            {formatRelative(item.createdAt)}
          </time>
        </p>
      </div>
    </li>
  );
}

/** Latest audit log rows across the platform: who did what, where and when. */
export function ActivityFeed() {
  const query = useActivity(ACTIVITY_LIMIT);
  const items = query.data?.data ?? [];

  return (
    <section
      aria-labelledby="activity-title"
      className="bg-card text-card-foreground rounded-card shadow-panel flex min-w-0 flex-col gap-4 border p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="activity-title" className="font-heading text-base font-bold">
          {t.title}
        </h2>
        <p className="text-muted-foreground text-sm">{t.description}</p>
      </div>

      {query.isPending ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{statsText.loading}</span>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-4">
          <p className="text-destructive text-sm">{t.error}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            {statsText.retry}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t.empty}
        </p>
      ) : (
        <ol aria-label={t.title} className="divide-border divide-y">
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ol>
      )}
    </section>
  );
}
