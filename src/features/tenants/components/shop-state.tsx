"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CircleAlert } from "lucide-react";
import {
  ForbiddenState,
  fullPageStateClass,
  NotFoundState,
} from "@/features/panel/components/status-pages";
import { toApiError } from "@/lib/api-error";
import { shopDetailText as t } from "../text";

/** Loading skeleton for the shop detail and edit pages. */
export function ShopPageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{t.loading}</span>
      <div className="flex items-center gap-4">
        <Skeleton className="hidden size-14 rounded-2xl sm:block" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="rounded-card h-80 xl:col-span-2" />
        <div className="flex flex-col gap-6">
          <Skeleton className="rounded-card h-40" />
          <Skeleton className="rounded-card h-56" />
        </div>
      </div>
    </div>
  );
}

/** 404 → the panel's not-found state, 403 → forbidden, else an error with retry. */
export function ShopLoadError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const { status } = toApiError(error);
  if (status === 404) return <NotFoundState />;
  if (status === 403) return <ForbiddenState />;
  return (
    <EmptyState
      role="alert"
      icon={CircleAlert}
      title={t.loadError}
      headingLevel="h1"
      className={fullPageStateClass}
      action={
        <Button variant="outline" size="lg" onClick={retry}>
          {t.retry}
        </Button>
      }
    />
  );
}
