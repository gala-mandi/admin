"use client";

import { type ReactNode, useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { calendarLabelLong } from "@/components/charts/data";
import { useAllTenants } from "@/features/tenants/hooks";
import { can } from "@/lib/can";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { selectRole, useSessionStore } from "@/stores/session";
import {
  activityByActionData,
  activityByDayData,
  shopsByCityData,
  shopsByStatusData,
  USERS_TOP_N,
  usersPerShopData,
} from "../chart-data";
import {
  ACTIVITY_ANALYTICS_LIMIT,
  useActivity,
  usePlatformStats,
} from "../hooks";
import { statsText } from "../text";

const t = statsText.analytics;

export function ShopsByStatusChart({ className }: { className?: string }) {
  const stats = usePlatformStats();
  const data = useMemo(
    () => (stats.data ? shopsByStatusData(stats.data) : undefined),
    [stats.data],
  );
  return (
    <ChartCard
      id="dashboard-shops-by-status"
      fileName="shops-by-status"
      testId="shops-by-status-chart"
      className={className}
      title={t.status.title}
      description={t.status.description}
      data={data}
      defaultType="donut"
      categoryLabel={t.status.category}
      isLoading={stats.isPending}
      isError={stats.isError}
      onRetry={() => void stats.refetch()}
      emptyText={t.status.empty}
    />
  );
}

/** Both shop charts read every shop once (shared cache entry). */
function useShopCharts() {
  const shops = useAllTenants();
  const rows = shops.data?.rows;
  const cities = useMemo(
    () => (rows ? shopsByCityData(rows) : undefined),
    [rows],
  );
  const users = useMemo(
    () => (rows ? usersPerShopData(rows) : undefined),
    [rows],
  );
  const basis = shops.data
    ? t.cities.basis(
        formatCount(shops.data.rows.length),
        formatCount(shops.data.total),
        shops.data.truncated,
      )
    : null;
  return { shops, cities, users, basis };
}

function ShopCharts() {
  const { shops, cities, users, basis } = useShopCharts();
  const state = {
    isLoading: shops.isPending,
    isError: shops.isError,
    onRetry: () => void shops.refetch(),
  };
  return (
    <>
      <ChartCard
        id="dashboard-shops-by-city"
        fileName="shops-by-city"
        testId="shops-by-city-chart"
        title={t.cities.title}
        description={t.cities.description}
        data={cities}
        defaultType="horizontalBar"
        categoryLabel={t.cities.category}
        emptyText={t.cities.empty}
        footer={basis}
        height={320}
        {...state}
      />
      <ChartCard
        id="dashboard-users-per-shop"
        fileName="users-per-shop"
        testId="users-per-shop-chart"
        title={t.users.title}
        description={t.users.description(USERS_TOP_N)}
        data={users}
        defaultType="horizontalBar"
        categoryLabel={t.users.category}
        emptyText={t.users.empty}
        footer={basis}
        height={320}
        {...state}
      />
    </>
  );
}

function ActivityCharts({ dayClassName }: { dayClassName?: string }) {
  const query = useActivity(ACTIVITY_ANALYTICS_LIMIT);
  const items = query.data?.data;
  const byAction = useMemo(
    () => (items ? activityByActionData(items) : undefined),
    [items],
  );
  const byDay = useMemo(
    () => (items ? activityByDayData(items) : undefined),
    [items],
  );
  const state = {
    isLoading: query.isPending,
    isError: query.isError,
    onRetry: () => void query.refetch(),
  };
  return (
    <>
      <ChartCard
        id="dashboard-activity-by-day"
        fileName="activity-by-day"
        testId="activity-by-day-chart"
        className={dayClassName}
        title={t.days.title}
        description={t.days.description(ACTIVITY_ANALYTICS_LIMIT)}
        data={byDay}
        defaultType="stackedArea"
        categoryLabel={t.days.category}
        formatCategoryLong={calendarLabelLong}
        emptyText={t.days.empty}
        {...state}
      />
      <ChartCard
        id="dashboard-activity-by-action"
        fileName="activity-by-action"
        testId="activity-by-action-chart"
        title={t.actions.title}
        description={t.actions.description(ACTIVITY_ANALYTICS_LIMIT)}
        data={byAction}
        defaultType="bar"
        categoryLabel={t.actions.category}
        emptyText={t.actions.empty}
        {...state}
      />
    </>
  );
}

/**
 * The dashboard's charts, from the existing endpoints only: status, new
 * shops, cities and users (every shop from `GET /admin/tenants`), and the
 * last 100 changes by action and by day. Every chart can switch type.
 */
export function DashboardAnalytics({
  newShops,
  feed,
  className,
}: {
  /** The new-shops chart, first in the grid. */
  newShops: ReactNode;
  /** The recent activity feed, beside the shop charts. */
  feed: ReactNode;
  className?: string;
}) {
  const role = useSessionStore(selectRole);
  // Shop lists are the Shops section's data; same rule as its menu entry.
  const canSeeShops = can(role, "shops:manage");

  return (
    <section
      aria-label={t.label}
      // Dense flow backfills the gaps the two-column cards leave.
      className={cn(
        "grid grid-flow-row-dense gap-6 lg:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col lg:col-span-2 [&>*]:flex-1">
        {newShops}
      </div>
      <ShopsByStatusChart />
      <ActivityCharts dayClassName="lg:col-span-2" />
      {canSeeShops ? <ShopCharts /> : null}
      <div className="flex min-w-0 flex-col lg:col-span-2 xl:col-span-1 [&>*]:flex-1">
        {feed}
      </div>
    </section>
  );
}
